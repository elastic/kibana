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
import { Stream } from 'stream';
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
  SentinelOneGetRemoteScriptResultsResponseSchema,
  SentinelOneGetRemoteScriptResultsParamsSchema,
  SentinelOneDownloadRemoteScriptResultsParamsSchema,
  SentinelOneDownloadRemoteScriptResultsResponseSchema,
  SentinelOneBaseApiResponseSchema,
} from '../../../common/sentinelone/schema';
import { SUB_ACTION } from '../../../common/sentinelone/constants';
import {
  SentinelOneFetchAgentFilesParams,
  SentinelOneDownloadAgentFileParams,
  SentinelOneGetActivitiesParams,
  SentinelOneGetRemoteScriptResultsParams,
  SentinelOneDownloadRemoteScriptResultsParams,
  SentinelOneGetRemoteScriptResultsApiResponse,
  SentinelOneGetRemoteScriptStatusApiResponse,
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
    remoteScriptsResults: string;
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
      remoteScriptsResults: `${this.config.url}${API_PATH}/remote-scripts/fetch-files`,
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
      name: SUB_ACTION.GET_REMOTE_SCRIPT_RESULTS,
      method: 'getRemoteScriptResults',
      schema: SentinelOneGetRemoteScriptResultsParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.DOWNLOAD_REMOTE_SCRIPT_RESULTS,
      method: 'downloadRemoteScriptResults',
      schema: SentinelOneDownloadRemoteScriptResultsParamsSchema,
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

  public async fetchAgentFiles(
    { files, agentId, zipPassCode }: SentinelOneFetchAgentFilesParams,
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    if (!agentId) {
      throw new Error(`'agentId' parameter is required`);
    }

    return this.sentinelOneApiRequest(
      {
        url: `${this.urls.agents}/${agentId}/actions/fetch-files`,
        method: 'post',
        data: {
          data: {
            password: zipPassCode,
            files,
          },
        },
        responseSchema: SentinelOneFetchAgentFilesResponseSchema,
      },
      connectorUsageCollector
    );
  }

  public async downloadAgentFile(
    { agentId, activityId }: SentinelOneDownloadAgentFileParams,
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    if (!agentId) {
      throw new Error(`'agentId' parameter is required`);
    }

    return this.sentinelOneApiRequest(
      {
        url: `${this.urls.agents}/${agentId}/uploads/${activityId}`,
        method: 'get',
        responseType: 'stream',
        responseSchema: SentinelOneDownloadAgentFileResponseSchema,
      },
      connectorUsageCollector
    );
  }

  public async getActivities(
    queryParams?: SentinelOneGetActivitiesParams,
    connectorUsageCollector?: ConnectorUsageCollector
  ) {
    return this.sentinelOneApiRequest(
      {
        url: this.urls.activities,
        method: 'get',
        params: queryParams,
        responseSchema: SentinelOneGetActivitiesResponseSchema,
      },
      connectorUsageCollector!
    );
  }

  public async executeScript(
    { filter, script }: SentinelOneExecuteScriptParams,
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    if (!filter.ids && !filter.uuids) {
      throw new Error(`A filter must be defined; either 'ids' or 'uuids'`);
    }

    return this.sentinelOneApiRequest(
      {
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
      },
      connectorUsageCollector
    );
  }

  public async isolateHost(
    { alertIds, ...payload }: SentinelOneIsolateHostParams,
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    const response = await this.getAgents(payload, connectorUsageCollector);

    if (response.data.length === 0) {
      const errorMessage = 'No agents found';

      throw new Error(errorMessage);
    }

    if (response.data[0].networkStatus === 'disconnected') {
      const errorMessage = 'Agent already isolated';

      throw new Error(errorMessage);
    }

    const agentId = response.data[0].id;

    return this.sentinelOneApiRequest(
      {
        url: this.urls.isolateHost,
        method: 'post',
        data: {
          filter: {
            ids: agentId,
          },
        },
        responseSchema: SentinelOneIsolateHostResponseSchema,
      },
      connectorUsageCollector
    );
  }

  public async releaseHost(
    { alertIds, ...payload }: SentinelOneIsolateHostParams,
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    const response = await this.getAgents(payload, connectorUsageCollector);

    if (response.data.length === 0) {
      throw new Error('No agents found');
    }

    if (response.data[0].networkStatus !== 'disconnected') {
      throw new Error('Agent not isolated');
    }

    const agentId = response.data[0].id;

    return this.sentinelOneApiRequest(
      {
        url: this.urls.releaseHost,
        method: 'post',
        data: {
          filter: {
            ids: agentId,
          },
        },
        responseSchema: SentinelOneIsolateHostResponseSchema,
      },
      connectorUsageCollector
    );
  }

  public async getAgents(
    payload: SentinelOneGetAgentsParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<SentinelOneGetAgentsResponse> {
    return this.sentinelOneApiRequest(
      {
        url: this.urls.agents,
        params: {
          ...payload,
        },
        responseSchema: SentinelOneGetAgentsResponseSchema,
      },
      connectorUsageCollector
    );
  }

  public async getRemoteScriptStatus(
    payload: SentinelOneGetRemoteScriptStatusParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<SentinelOneGetRemoteScriptStatusApiResponse> {
    return this.sentinelOneApiRequest(
      {
        url: this.urls.remoteScriptStatus,
        params: {
          parent_task_id: payload.parentTaskId,
        },
        responseSchema: SentinelOneGetRemoteScriptStatusResponseSchema,
      },
      connectorUsageCollector
    ) as unknown as SentinelOneGetRemoteScriptStatusApiResponse;
  }

  public async getRemoteScriptResults(
    { taskIds }: SentinelOneGetRemoteScriptResultsParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<SentinelOneGetRemoteScriptResultsApiResponse> {
    return this.sentinelOneApiRequest(
      {
        url: this.urls.remoteScriptsResults,
        method: 'post',
        data: { data: { taskIds } },
        responseSchema: SentinelOneGetRemoteScriptResultsResponseSchema,
      },
      connectorUsageCollector
    ) as unknown as SentinelOneGetRemoteScriptResultsApiResponse;
  }

  public async downloadRemoteScriptResults(
    { taskId }: SentinelOneDownloadRemoteScriptResultsParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<Stream> {
    const scriptResultsInfo = await this.getRemoteScriptResults(
      { taskIds: [taskId] },
      connectorUsageCollector
    );

    this.logger.debug(
      () => `script results for taskId [${taskId}]:\n${JSON.stringify(scriptResultsInfo)}`
    );

    let fileUrl: string = '';

    for (const downloadLinkInfo of scriptResultsInfo.data.download_links) {
      if (downloadLinkInfo.taskId === taskId) {
        fileUrl = downloadLinkInfo.downloadUrl;
        break;
      }
    }

    if (!fileUrl) {
      throw new Error(`Download URL for script results of task id [${taskId}] not found`);
    }

    const downloadConnection = await this.request(
      {
        url: fileUrl,
        method: 'get',
        responseType: 'stream',
        responseSchema: SentinelOneDownloadRemoteScriptResultsResponseSchema,
      },
      connectorUsageCollector
    );

    return downloadConnection.data;
  }

  private async sentinelOneApiRequest<R extends SentinelOneBaseApiResponse>(
    req: SubActionRequestParams<R>,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<R> {
    const response = await this.request<R>(
      {
        ...req,
        // We don't validate responses from SentinelOne API's because we do not want failures for cases
        // where the external system might add/remove/change values in the response that we have no
        // control over.
        responseSchema:
          SentinelOneBaseApiResponseSchema as unknown as SubActionRequestParams<R>['responseSchema'],
        params: {
          ...req.params,
          APIToken: this.secrets.token,
        },
      },
      connectorUsageCollector
    );

    return response.data;
  }

  protected getResponseErrorMessage(error: AxiosError): string {
    const appendResponseBody = (message: string): string => {
      const responseBody = JSON.stringify(error.response?.data ?? {});

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
    payload: SentinelOneGetRemoteScriptsParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<SentinelOneGetRemoteScriptsResponse> {
    return this.sentinelOneApiRequest(
      {
        url: this.urls.remoteScripts,
        params: {
          limit: API_MAX_RESULTS,
          ...payload,
        },
        responseSchema: SentinelOneGetRemoteScriptsResponseSchema,
      },
      connectorUsageCollector
    );
  }
}
