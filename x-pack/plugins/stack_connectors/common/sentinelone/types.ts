/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  SentinelOneConfig,
  SentinelOneSecrets,
  SentinelOneBaseApiResponse,
  SentinelOneGetAgentsParams,
  SentinelOneGetAgentsResponse,
  SentinelOneExecuteScriptParams,
  SentinelOneExecuteScriptResponse,
  SentinelOneGetRemoteScriptStatusParams,
  SentinelOneGetRemoteScriptResultsParams,
  SentinelOneDownloadRemoteScriptResultsParams,
  SentinelOneGetRemoteScriptsParams,
  SentinelOneGetRemoteScriptsResponse,
  SentinelOneFetchAgentFilesParams,
  SentinelOneFetchAgentFilesResponse,
  SentinelOneDownloadAgentFileParams,
  SentinelOneActivityRecord,
  SentinelOneGetActivitiesParams,
  SentinelOneGetActivitiesResponse,
  SentinelOneIsolateHostParams,
  SentinelOneActionParams,
} from '../../server/connector_types/sentinelone/schema';

interface SentinelOnePagination {
  pagination: {
    totalItems: number;
    nextCursor?: string;
  };
}

interface SentinelOneErrors {
  errors?: string[];
}

export type SentinelOneOsType = 'linux' | 'macos' | 'windows';

export interface SentinelOneRemoteScriptExecutionStatus {
  accountId: string;
  accountName: string;
  agentComputerName: string;
  agentId: string;
  agentIsActive: boolean;
  agentIsDecommissioned: boolean;
  agentMachineType: string;
  agentOsType: SentinelOneOsType;
  agentUuid: string;
  createdAt: string;
  description?: string;
  detailedStatus?: string;
  groupId: string;
  groupName: string;
  /** The `id` can be used to retrieve the script results file from sentinleone */
  id: string;
  initiatedBy: string;
  initiatedById: string;
  parentTaskId: string;
  /** `scriptResultsSignature` will be present only when there is a file with results */
  scriptResultsSignature?: string;
  siteId: string;
  siteName: string;
  status:
    | 'canceled'
    | 'completed'
    | 'created'
    | 'expired'
    | 'failed'
    | 'in_progress'
    | 'partially_completed'
    | 'pending'
    | 'pending_user_action'
    | 'scheduled';
  statusCode?: string;
  statusDescription: string;
  type: string;
  updatedAt: string;
}

export interface SentinelOneGetRemoteScriptStatusApiResponse
  extends SentinelOnePagination,
    SentinelOneErrors {
  data: SentinelOneRemoteScriptExecutionStatus[];
}

export interface SentinelOneGetRemoteScriptResults {
  download_links: Array<{
    downloadUrl: string;
    fileName: string;
    taskId: string;
  }>;
  errors?: Array<{
    taskId: string;
    errorString: string;
  }>;
}

export interface SentinelOneGetRemoteScriptResultsApiResponse extends SentinelOneErrors {
  data: SentinelOneGetRemoteScriptResults;
}
