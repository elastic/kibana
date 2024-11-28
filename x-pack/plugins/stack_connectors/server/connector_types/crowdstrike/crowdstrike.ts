/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';

import type { AxiosError } from 'axios';
import { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { CrowdStrikeSessionManager } from './rtr_session_manager';
import { ExperimentalFeatures } from '../../../common/experimental_features';
import { isAggregateError, NodeSystemError } from './types';
import type {
  CrowdstrikeConfig,
  CrowdstrikeSecrets,
  CrowdstrikeGetAgentsResponse,
  CrowdstrikeGetAgentsParams,
  CrowdstrikeHostActionsParams,
  CrowdstrikeGetTokenResponse,
  CrowdstrikeGetAgentOnlineStatusResponse,
  RelaxedCrowdstrikeBaseApiResponse,
  CrowdstrikeInitRTRParams,
} from '../../../common/crowdstrike/types';
import {
  CrowdstrikeHostActionsParamsSchema,
  CrowdstrikeGetAgentsParamsSchema,
  CrowdstrikeGetTokenResponseSchema,
  CrowdstrikeHostActionsResponseSchema,
  RelaxedCrowdstrikeBaseApiResponseSchema,
  CrowdstrikeInitRTRResponseSchema,
  CrowdstrikeRTRCommandParamsSchema,
} from '../../../common/crowdstrike/schema';
import { SUB_ACTION } from '../../../common/crowdstrike/constants';
import { CrowdstrikeError } from './error';

const paramsSerializer = (params: Record<string, string>) => {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
};

/**
 * Crowdstrike Connector
 * @constructor
 * @param {string} token - Authorization token received from OAuth2 API, that needs to be sent along with each request.
 * @param {number} tokenExpiryTimeout - Tokens are valid for 30 minutes, so we will refresh them every 29 minutes
 * @param {base64} base64encodedToken - The base64 encoded token used for authentication.
 */

export class CrowdstrikeConnector extends SubActionConnector<
  CrowdstrikeConfig,
  CrowdstrikeSecrets
> {
  private static token: string | null;
  private static tokenExpiryTimeout: NodeJS.Timeout;
  // @ts-expect-error not used at the moment, will be used in a follow up PR
  private static currentBatchId: string | undefined;
  private static base64encodedToken: string;
  private experimentalFeatures: ExperimentalFeatures;

  private crowdStrikeSessionManager: CrowdStrikeSessionManager;
  private urls: {
    getToken: string;
    agents: string;
    hostAction: string;
    agentStatus: string;
    batchInitRTRSession: string;
    batchRefreshRTRSession: string;
  };

  constructor(
    params: ServiceParams<CrowdstrikeConfig, CrowdstrikeSecrets>,
    experimentalFeatures: ExperimentalFeatures
  ) {
    super(params);
    this.experimentalFeatures = experimentalFeatures;
    this.urls = {
      getToken: `${this.config.url}/oauth2/token`,
      hostAction: `${this.config.url}/devices/entities/devices-actions/v2`,
      agents: `${this.config.url}/devices/entities/devices/v2`,
      agentStatus: `${this.config.url}/devices/entities/online-state/v1`,
      batchInitRTRSession: `${this.config.url}/real-time-response/combined/batch-init-session/v1`,
      batchRefreshRTRSession: `${this.config.url}/real-time-response/combined/batch-refresh-session/v1`,
    };

    if (!CrowdstrikeConnector.base64encodedToken) {
      CrowdstrikeConnector.base64encodedToken = Buffer.from(
        this.secrets.clientId + ':' + this.secrets.clientSecret
      ).toString('base64');
    }

    this.crowdStrikeSessionManager = new CrowdStrikeSessionManager(
      this.urls,
      this.crowdstrikeApiRequest
    );
    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.GET_AGENT_DETAILS,
      method: 'getAgentDetails',
      schema: CrowdstrikeGetAgentsParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.HOST_ACTIONS,
      method: 'executeHostActions',
      schema: CrowdstrikeHostActionsParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.GET_AGENT_ONLINE_STATUS,
      method: 'getAgentOnlineStatus',
      schema: CrowdstrikeGetAgentsParamsSchema,
    });

    if (this.experimentalFeatures.crowdstrikeConnectorRTROn) {
      this.registerSubAction({
        name: SUB_ACTION.EXECUTE_RTR_COMMAND,
        method: 'executeRTRCommand',
        schema: CrowdstrikeRTRCommandParamsSchema, // Define a proper schema for the command
      });
    }
  }

  public async executeHostActions(
    { alertIds, ...payload }: CrowdstrikeHostActionsParams,
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    return this.crowdstrikeApiRequest(
      {
        url: this.urls.hostAction,
        method: 'post',
        params: {
          action_name: payload.command,
        },
        data: {
          ids: payload.ids,
          ...(payload.actionParameters
            ? {
                action_parameters: Object.entries(payload.actionParameters).map(
                  ([name, value]) => ({
                    name,
                    value,
                  })
                ),
              }
            : {}),
        },
        paramsSerializer,
        responseSchema: CrowdstrikeHostActionsResponseSchema,
      },
      connectorUsageCollector
    );
  }

  public async getAgentDetails(
    payload: CrowdstrikeGetAgentsParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<CrowdstrikeGetAgentsResponse> {
    return this.crowdstrikeApiRequest(
      {
        url: this.urls.agents,
        method: 'GET',
        params: {
          ids: payload.ids,
        },
        paramsSerializer,
        responseSchema: RelaxedCrowdstrikeBaseApiResponseSchema,
      },
      connectorUsageCollector
    ) as Promise<CrowdstrikeGetAgentsResponse>;
  }

  public async getAgentOnlineStatus(
    payload: CrowdstrikeGetAgentsParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<CrowdstrikeGetAgentOnlineStatusResponse> {
    return this.crowdstrikeApiRequest(
      {
        url: this.urls.agentStatus,
        method: 'GET',
        params: {
          ids: payload.ids,
        },
        paramsSerializer,
        responseSchema: RelaxedCrowdstrikeBaseApiResponseSchema,
      },
      connectorUsageCollector
    ) as Promise<CrowdstrikeGetAgentOnlineStatusResponse>;
  }

  private async getTokenRequest(connectorUsageCollector: ConnectorUsageCollector) {
    const response = await this.request<CrowdstrikeGetTokenResponse>(
      {
        url: this.urls.getToken,
        method: 'post',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          authorization: 'Basic ' + CrowdstrikeConnector.base64encodedToken,
        },
        responseSchema: CrowdstrikeGetTokenResponseSchema,
      },
      connectorUsageCollector
    );
    const token = response.data?.access_token;
    if (token) {
      // Clear any existing timeout
      clearTimeout(CrowdstrikeConnector.tokenExpiryTimeout);

      // Set a timeout to reset the token after 29 minutes (it expires after 30 minutes)
      CrowdstrikeConnector.tokenExpiryTimeout = setTimeout(() => {
        CrowdstrikeConnector.token = null;
      }, 29 * 60 * 1000);
    }
    return token;
  }

  private async crowdstrikeApiRequest<R extends RelaxedCrowdstrikeBaseApiResponse>(
    req: SubActionRequestParams<R>,
    connectorUsageCollector: ConnectorUsageCollector,
    retried?: boolean
  ): Promise<R> {
    try {
      if (!CrowdstrikeConnector.token) {
        CrowdstrikeConnector.token = (await this.getTokenRequest(
          connectorUsageCollector
        )) as string;
      }

      const response = await this.request<R>(
        {
          ...req,
          headers: {
            ...req.headers,
            Authorization: `Bearer ${CrowdstrikeConnector.token}`,
          },
        },
        connectorUsageCollector
      );

      return response.data;
    } catch (error) {
      if (error.code === 401 && !retried) {
        CrowdstrikeConnector.token = null;
        return this.crowdstrikeApiRequest(req, connectorUsageCollector, true);
      }
      throw new CrowdstrikeError(error.message);
    }
  }

  public async batchInitRTRSession(
    payload: CrowdstrikeInitRTRParams,
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    const response = await this.crowdstrikeApiRequest(
      {
        url: this.urls.batchInitRTRSession,
        method: 'post',
        data: {
          host_ids: payload.endpoint_ids,
        },
        paramsSerializer,
        responseSchema: CrowdstrikeInitRTRResponseSchema,
      },
      connectorUsageCollector
    );

    CrowdstrikeConnector.currentBatchId = response.batch_id;
  }

  // TODO: WIP - just to have session init logic in place
  public async executeRTRCommand(
    payload: { command: string; endpoint_ids: string[] },
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    const batchId = await this.crowdStrikeSessionManager.initializeSession(
      { endpoint_ids: payload.endpoint_ids },
      connectorUsageCollector
    );

    return Promise.resolve({ batchId });
  }

  protected getResponseErrorMessage(
    error: AxiosError<{ errors: Array<{ message: string; code: number }> }>
  ): string {
    const errorData = error.response?.data?.errors?.[0];
    if (errorData) {
      return errorData.message;
    }

    const cause: NodeSystemError = isAggregateError(error.cause)
      ? error.cause.errors[0]
      : error.cause;
    if (cause) {
      // ENOTFOUND is the error code for when the host is unreachable eg. api.crowdstrike.com111
      if (cause.code === 'ENOTFOUND') {
        return `URL not found: ${cause.hostname}`;
      }
      // ECONNREFUSED is the error code for when the host is unreachable eg. http://MacBook-Pro-Tomasz.local:55555
      if (cause.code === 'ECONNREFUSED') {
        return `Connection Refused: ${cause.address}:${cause.port}`;
      }
    }

    if (!error.response?.status) {
      return `Unknown API Error: ${JSON.stringify(error.response?.data ?? {})}`;
    }

    return `API Error: ${JSON.stringify(error.response.data ?? {})}`;
  }
}
