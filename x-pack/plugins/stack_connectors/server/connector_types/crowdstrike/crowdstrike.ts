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
} from '../../../common/crowdstrike/types';
import {
  CrowdstrikeGetAgentsResponseSchema,
  CrowdstrikeIsolateHostResponseSchema,
  CrowdstrikeIsolateHostParamsSchema,
  CrowdstrikeGetAgentsParamsSchema,
} from '../../../common/crowdstrike/schema';
import { SUB_ACTION } from '../../../common/crowdstrike/constants';

export const API_MAX_RESULTS = 1000;
export const API_PATH = '/api.crowdstrike.com/';

export class CrowdstrikeConnector extends SubActionConnector<
  CrowdstrikeConfig,
  CrowdstrikeSecrets
> {
  private urls: {
    agents: string;
    hostAction: string;
  };

  constructor(params: ServiceParams<CrowdstrikeConfig, CrowdstrikeSecrets>) {
    super(params);

    this.urls = {
      hostAction: `${this.config.url}${API_PATH}/devices/entities/devices-actions/v2`,
      agents: `${this.config.url}${API_PATH}/devices/entities/devices/v1 `,
    };

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.GET_AGENTS,
      method: 'getAgents',
      schema: CrowdstrikeGetAgentsParamsSchema,
    });
    this.registerSubAction({
      name: SUB_ACTION.GET_AGENT_DETAILS,
      method: 'getAgentDetails',
      schema: CrowdstrikeGetAgentsParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.HOST_ACTIONS,
      method: 'hostActions',
      schema: CrowdstrikeIsolateHostParamsSchema,
    });
  }

  public async executeHostActions({ alertIds, ...payload }: CrowdstrikeIsolateHostParams) {
    const response = await this.getAgents(payload);

    if (response.data.length === 0) {
      const errorMessage = 'No agents found';

      throw new Error(errorMessage);
    }

    if (response.data[0].networkStatus === 'disconnected') {
      const errorMessage = 'Agent already isolated';

      throw new Error(errorMessage);
    }

    const agentId = response.data[0].id;

    return this.crowdstrikeApiRequest({
      url: this.urls.hostAction,
      method: 'post',
      data: {
        filter: {
          ids: agentId,
        },
      },
      responseSchema: CrowdstrikeIsolateHostResponseSchema,
    });
  }

  public async getAgents(
    payload: CrowdstrikeGetAgentsParams
  ): Promise<CrowdstrikeGetAgentsResponse> {
    return this.crowdstrikeApiRequest({
      url: this.urls.agents,
      params: {
        ...payload,
      },
      responseSchema: CrowdstrikeGetAgentsResponseSchema,
    });
  }

  private async crowdstrikeApiRequest<R extends CrowdstrikeBaseApiResponse>(
    req: SubActionRequestParams<R>
  ): Promise<R> {
    const response = await this.request<R>({
      ...req,
      params: {
        ...req.params,
        APIToken: this.secrets.token,
      },
    });

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
