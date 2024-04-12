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
  SentinelOneConfig,
  SentinelOneSecrets,
  SentinelOneGetAgentsResponse,
  SentinelOneGetAgentsParams,
  SentinelOneGetRemoteScriptStatusParams,
  SentinelOneBaseApiResponse,
  SentinelOneGetRemoteScriptsParams,
  SentinelOneGetRemoteScriptsResponse,
  SentinelOneIsolateHostParams,
  SentinelOneExecuteScriptParams,
} from '../../../common/sentinelone/types';
import {
  SentinelOneExecuteScriptParamsSchema,
  SentinelOneGetRemoteScriptsParamsSchema,
  SentinelOneGetRemoteScriptsResponseSchema,
  SentinelOneGetAgentsResponseSchema,
  SentinelOneIsolateHostResponseSchema,
  SentinelOneIsolateHostParamsSchema,
  SentinelOneGetRemoteScriptStatusParamsSchema,
  SentinelOneGetRemoteScriptStatusResponseSchema,
  SentinelOneGetAgentsParamsSchema,
  SentinelOneExecuteScriptResponseSchema,
  SentinelOneFetchAgentFilesParamsSchema,
  SentinelOneFetchAgentFilesResponseSchema,
  SentinelOneDownloadAgentFileParamsSchema,
  SentinelOneDownloadAgentFileResponseSchema,
  SentinelOneGetActivitiesParamsSchema,
  SentinelOneGetActivitiesResponseSchema,
} from '../../../common/sentinelone/schema';
import { SUB_ACTION } from '../../../common/sentinelone/constants';
import {
  SentinelOneFetchAgentFilesParams,
  SentinelOneDownloadAgentFileParams,
  SentinelOneGetActivitiesParams,
} from '../../../common/sentinelone/types';

export const API_MAX_RESULTS = 1000;
export const API_PATH = '/web/api/v2.1';

export class SentinelOneConnector extends SubActionConnector<
  SentinelOneConfig,
  SentinelOneSecrets
> {
  private urls: {
    agents: string;
    isolateHost: string;
    releaseHost: string;
    remoteScripts: string;
    remoteScriptStatus: string;
    remoteScriptsExecute: string;
    activities: string;
  };

  constructor(params: ServiceParams<SentinelOneConfig, SentinelOneSecrets>) {
    super(params);

    this.urls = {
      isolateHost: `${this.config.url}${API_PATH}/agents/actions/disconnect`,
      releaseHost: `${this.config.url}${API_PATH}/agents/actions/connect`,
      remoteScripts: `${this.config.url}${API_PATH}/remote-scripts`,
      remoteScriptStatus: `${this.config.url}${API_PATH}/remote-scripts/status`,
      remoteScriptsExecute: `${this.config.url}${API_PATH}/remote-scripts/execute`,
      agents: `${this.config.url}${API_PATH}/agents`,
      activities: `${this.config.url}${API_PATH}/activities`,
    };

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.GET_REMOTE_SCRIPTS,
      method: 'getRemoteScripts',
      schema: SentinelOneGetRemoteScriptsParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.FETCH_AGENT_FILES,
      method: 'fetchAgentFiles',
      schema: SentinelOneFetchAgentFilesParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.DOWNLOAD_AGENT_FILE,
      method: 'downloadAgentFile',
      schema: SentinelOneDownloadAgentFileParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.GET_ACTIVITIES,
      method: 'getActivities',
      schema: SentinelOneGetActivitiesParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.GET_REMOTE_SCRIPT_STATUS,
      method: 'getRemoteScriptStatus',
      schema: SentinelOneGetRemoteScriptStatusParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.GET_AGENTS,
      method: 'getAgents',
      schema: SentinelOneGetAgentsParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.ISOLATE_HOST,
      method: 'isolateHost',
      schema: SentinelOneIsolateHostParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.RELEASE_HOST,
      method: 'releaseHost',
      schema: SentinelOneIsolateHostParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.EXECUTE_SCRIPT,
      method: 'executeScript',
      schema: SentinelOneExecuteScriptParamsSchema,
    });
  }

  public async fetchAgentFiles({
    files,
    agentUUID,
    zipPassCode,
  }: SentinelOneFetchAgentFilesParams) {
    const agent = await this.getAgents({ uuid: agentUUID });
    const agentId = agent.data[0]?.id;

    if (!agentId) {
      throw new Error(`No agent found in SentinelOne for UUID [${agentUUID}]`);
    }

    return this.sentinelOneApiRequest({
      url: `${this.urls.agents}/${agentId}/actions/fetch-files`,
      method: 'post',
      data: {
        data: {
          password: zipPassCode,
          files,
        },
      },
      responseSchema: SentinelOneFetchAgentFilesResponseSchema,
    });
  }

  public async downloadAgentFile({ agentUUID, activityId }: SentinelOneDownloadAgentFileParams) {
    const agent = await this.getAgents({ uuid: agentUUID });
    const agentId = agent.data[0]?.id;

    if (!agentId) {
      throw new Error(`No agent found in SentinelOne for UUID [${agentUUID}]`);
    }

    return this.sentinelOneApiRequest({
      url: `${this.urls.agents}/${agentId}/uploads/${activityId}`,
      method: 'get',
      responseType: 'stream',
      responseSchema: SentinelOneDownloadAgentFileResponseSchema,
    });
  }

  public async getActivities(queryParams?: SentinelOneGetActivitiesParams) {
    return this.sentinelOneApiRequest({
      url: this.urls.activities,
      method: 'get',
      params: queryParams,
      responseSchema: SentinelOneGetActivitiesResponseSchema,
    });
  }

  public async executeScript({ filter, script }: SentinelOneExecuteScriptParams) {
    if (!filter.ids && !filter.uuids) {
      throw new Error(`A filter must be defined; either 'ids' or 'uuids'`);
    }

    return this.sentinelOneApiRequest({
      url: this.urls.remoteScriptsExecute,
      method: 'post',
      data: {
        data: {
          outputDestination: 'SentinelCloud',
          ...script,
        },
        filter,
      },
      responseSchema: SentinelOneExecuteScriptResponseSchema,
    });
  }

  public async isolateHost({ alertIds, ...payload }: SentinelOneIsolateHostParams) {
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

    return this.sentinelOneApiRequest({
      url: this.urls.isolateHost,
      method: 'post',
      data: {
        filter: {
          ids: agentId,
        },
      },
      responseSchema: SentinelOneIsolateHostResponseSchema,
    });
  }

  public async releaseHost({ alertIds, ...payload }: SentinelOneIsolateHostParams) {
    const response = await this.getAgents(payload);

    if (response.data.length === 0) {
      throw new Error('No agents found');
    }

    if (response.data[0].networkStatus !== 'disconnected') {
      throw new Error('Agent not isolated');
    }

    const agentId = response.data[0].id;

    return this.sentinelOneApiRequest({
      url: this.urls.releaseHost,
      method: 'post',
      data: {
        filter: {
          ids: agentId,
        },
      },
      responseSchema: SentinelOneIsolateHostResponseSchema,
    });
  }

  public async getAgents(
    payload: SentinelOneGetAgentsParams
  ): Promise<SentinelOneGetAgentsResponse> {
    return this.sentinelOneApiRequest({
      url: this.urls.agents,
      params: {
        ...payload,
      },
      responseSchema: SentinelOneGetAgentsResponseSchema,
    });
  }

  public async getRemoteScriptStatus(payload: SentinelOneGetRemoteScriptStatusParams) {
    return this.sentinelOneApiRequest({
      url: this.urls.remoteScriptStatus,
      params: {
        parent_task_id: payload.parentTaskId,
      },
      responseSchema: SentinelOneGetRemoteScriptStatusResponseSchema,
    });
  }

  private async sentinelOneApiRequest<R extends SentinelOneBaseApiResponse>(
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
    const appendResponseBody = (message: string): string => {
      const responseBody =
        error.response?.data && error.response?.config?.responseType !== 'stream'
          ? JSON.stringify(error.response?.data)
          : '';

      if (responseBody) {
        return `${message}\nResponse body: ${responseBody}`;
      }

      return message;
    };

    if (!error.response?.status) {
      return appendResponseBody(error.message ?? 'Unknown API Error');
    }

    if (error.response.status === 401) {
      return appendResponseBody('Unauthorized API Error (401)');
    }

    return appendResponseBody(`API Error: [${error.response?.statusText}] ${error.message}`);
  }

  public async getRemoteScripts(
    payload: SentinelOneGetRemoteScriptsParams
  ): Promise<SentinelOneGetRemoteScriptsResponse> {
    return this.sentinelOneApiRequest({
      url: this.urls.remoteScripts,
      params: {
        limit: API_MAX_RESULTS,
        ...payload,
      },
      responseSchema: SentinelOneGetRemoteScriptsResponseSchema,
    });
  }
}
