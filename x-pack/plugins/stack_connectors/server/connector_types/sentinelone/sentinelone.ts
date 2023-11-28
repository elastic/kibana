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
  SentinelOneIsolateAgentParams,
  SentinelOneKillProcessParams,
  SentinelOneExecuteScriptParams,
} from '../../../common/sentinelone/types';
import {
  SentinelOneKillProcessResponseSchema,
  SentinelOneExecuteScriptParamsSchema,
  SentinelOneGetRemoteScriptsParamsSchema,
  SentinelOneGetRemoteScriptsResponseSchema,
  SentinelOneGetAgentsResponseSchema,
  SentinelOneIsolateAgentResponseSchema,
  SentinelOneIsolateAgentParamsSchema,
  SentinelOneGetRemoteScriptStatusParamsSchema,
  SentinelOneGetRemoteScriptStatusResponseSchema,
  SentinelOneGetAgentsParamsSchema,
  SentinelOneExecuteScriptResponseSchema,
} from '../../../common/sentinelone/schema';
import { SUB_ACTION } from '../../../common/sentinelone/constants';

export const API_MAX_RESULTS = 1000;
export const API_PATH = '/web/api/v2.1';

export class SentinelOneConnector extends SubActionConnector<
  SentinelOneConfig,
  SentinelOneSecrets
> {
  private urls: {
    agents: string;
    isolateAgent: string;
    releaseAgent: string;
    remoteScripts: string;
    remoteScriptStatus: string;
    remoteScriptsExecute: string;
  };

  constructor(params: ServiceParams<SentinelOneConfig, SentinelOneSecrets>) {
    super(params);

    this.urls = {
      isolateAgent: `${this.config.url}${API_PATH}/agents/actions/disconnect`,
      releaseAgent: `${this.config.url}${API_PATH}/agents/actions/connect`,
      remoteScripts: `${this.config.url}${API_PATH}/remote-scripts`,
      remoteScriptStatus: `${this.config.url}${API_PATH}/remote-scripts/status`,
      remoteScriptsExecute: `${this.config.url}${API_PATH}/remote-scripts/execute`,
      agents: `${this.config.url}${API_PATH}/agents`,
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
      name: SUB_ACTION.ISOLATE_AGENT,
      method: 'isolateAgent',
      schema: SentinelOneIsolateAgentParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.RELEASE_AGENT,
      method: 'releaseAgent',
      schema: SentinelOneIsolateAgentParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.KILL_PROCESS,
      method: 'killProcess',
      schema: SentinelOneKillProcessResponseSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.EXECUTE_SCRIPT,
      method: 'executeScript',
      schema: SentinelOneExecuteScriptParamsSchema,
    });
  }

  public async executeScript(payload: SentinelOneExecuteScriptParams) {
    return this.sentinelOneApiRequest({
      url: this.urls.remoteScriptsExecute,
      method: 'post',
      data: {
        data: {
          outputDestination: 'SentinelCloud',
          ...payload.script,
        },
        filter: {
          computerName: payload.computerName,
        },
      },
      responseSchema: SentinelOneExecuteScriptResponseSchema,
    });
  }

  public async killProcess({ processName, ...payload }: SentinelOneKillProcessParams) {
    const agentData = await this.getAgents(payload);

    const agentId = agentData.data[0]?.id;

    if (!agentId) {
      throw new Error(`No agent found for filter ${JSON.stringify(payload)}`);
    }

    const terminateScriptResponse = await this.getRemoteScripts({
      query: 'terminate',
      osTypes: [agentData?.data[0]?.osType],
    });

    if (!processName) {
      throw new Error('No process name provided');
    }

    return this.sentinelOneApiRequest({
      url: this.urls.remoteScriptsExecute,
      method: 'post',
      data: {
        data: {
          outputDestination: 'SentinelCloud',
          scriptId: terminateScriptResponse.data[0].id,
          scriptRuntimeTimeoutSeconds: terminateScriptResponse.data[0].scriptRuntimeTimeoutSeconds,
          taskDescription: terminateScriptResponse.data[0].scriptName,
          inputParams: `--terminate --processes ${processName}`,
        },
        filter: {
          ids: agentId,
        },
      },
      responseSchema: SentinelOneKillProcessResponseSchema,
    });
  }

  public async isolateAgent(payload: SentinelOneIsolateAgentParams) {
    const response = await this.getAgents(payload);

    if (response.data.length === 0) {
      throw new Error('No agents found');
    }

    if (response.data[0].networkStatus === 'disconnected') {
      throw new Error('Agent already isolated');
    }

    const agentId = response.data[0].id;

    return this.sentinelOneApiRequest({
      url: this.urls.isolateAgent,
      method: 'post',
      data: {
        filter: {
          ids: agentId,
        },
      },
      responseSchema: SentinelOneIsolateAgentResponseSchema,
    });
  }

  public async releaseAgent(payload: SentinelOneIsolateAgentParams) {
    const response = await this.getAgents(payload);

    if (response.data.length === 0) {
      throw new Error('No agents found');
    }

    if (response.data[0].networkStatus !== 'disconnected') {
      throw new Error('Agent not isolated');
    }

    const agentId = response.data[0].id;

    return this.sentinelOneApiRequest({
      url: this.urls.releaseAgent,
      method: 'post',
      data: {
        filter: {
          ids: agentId,
        },
      },
      responseSchema: SentinelOneIsolateAgentResponseSchema,
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
    if (!error.response?.status) {
      return 'Unknown API Error';
    }
    if (error.response.status === 401) {
      return 'Unauthorized API Error';
    }
    return `API Error: ${error.response?.statusText}`;
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
