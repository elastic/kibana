/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import type { AxiosError } from 'axios';
import { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import type {
  CrowdstrikeConfig,
  CrowdstrikeSecrets,
  CrowdstrikeGetAgentsResponse,
  CrowdstrikeGetAgentsParams,
  CrowdstrikeBaseApiResponse,
  CrowdstrikeIsolateHostParams,
  CrowdstrikeGetTokenResponse,
} from '../../../common/crowdstrike/types';
import {
  CrowdstrikeGetAgentsResponseSchema,
  CrowdstrikeIsolateHostParamsSchema,
  CrowdstrikeGetAgentsParamsSchema,
} from '../../../common/crowdstrike/schema';
import { SUB_ACTION } from '../../../common/crowdstrike/constants';

export const API_PATH = 'https://api.crowdstrike.com';

const paramsSerializer = (params: Record<string, string>) => {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
};

export class CrowdstrikeConnector extends SubActionConnector<
  CrowdstrikeConfig,
  CrowdstrikeSecrets
> {
  private static token: string | null;
  private static tokenExpiryTimeout: NodeJS.Timeout;

  private urls: {
    getToken: string;
    agents: string;
    hostAction: string;
  };

  constructor(params: ServiceParams<CrowdstrikeConfig, CrowdstrikeSecrets>) {
    super(params);
    this.urls = {
      getToken: `${API_PATH}/oauth2/token`,
      hostAction: `${API_PATH}/devices/entities/devices-actions/v2`,
      agents: `${API_PATH}/devices/entities/devices/v2 `,
    };

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
      schema: CrowdstrikeIsolateHostParamsSchema,
    });
  }

  public async executeHostActions({ alertIds, ...payload }: CrowdstrikeIsolateHostParams) {
    return this.crowdstrikeApiRequest({
      url: this.urls.hostAction,
      method: 'post',
      params: {
        action_name: payload.command,
      },
      data: {
        ids: payload.ids,
      },
      paramsSerializer,
      // check
      responseSchema: CrowdstrikeGetAgentsResponseSchema,
    });
    // TODO TC: check if we need to handle errors here
  }

  public async getAgentDetails(
    payload: CrowdstrikeGetAgentsParams
  ): Promise<CrowdstrikeGetAgentsResponse> {
    return this.crowdstrikeApiRequest({
      url: this.urls.agents,
      method: 'GET',
      params: {
        ids: payload.ids,
      },
      paramsSerializer,
      responseSchema: CrowdstrikeGetAgentsResponseSchema,
    });
  }

  private async getTokenRequest() {
    const base64encodedData = Buffer.from(
      this.secrets.clientId + ':' + this.secrets.clientSecret
    ).toString('base64');

    // TODO TC: fix types
    const response: CrowdstrikeGetTokenResponse = await this.request<CrowdstrikeBaseApiResponse>({
      url: this.urls.getToken,
      method: 'post',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        authorization: 'Basic ' + base64encodedData,
      },
      responseSchema: CrowdstrikeGetAgentsResponseSchema,
      // responseSchema: CrowdsrtikeGetTokenResponseSchema,
    });
    const token = response.data.access_token;
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
  private async crowdstrikeApiRequest<R extends CrowdstrikeBaseApiResponse>(
    req: SubActionRequestParams<R>
  ): Promise<R> {
    if (!CrowdstrikeConnector.token) {
      CrowdstrikeConnector.token = (await this.getTokenRequest()) as string;
    }

    const response = await this.request<R>({
      ...req,
      headers: {
        ...req.headers,
        Authorization: `Bearer ${CrowdstrikeConnector.token}`,
      },
    });
    // TODO TC: in case of 401 error, we should retry the request with a new token

    return response.data;
  }

  protected getResponseErrorMessage(error: AxiosError): string {
    if (!error.response?.status) {
      return 'Unknown API Error';
    }
    if (error.response.status === 401) {
      return 'Unauthorized API Error';
    }
    return `API Error: ${error.response?.statusText}`;
  }
}
