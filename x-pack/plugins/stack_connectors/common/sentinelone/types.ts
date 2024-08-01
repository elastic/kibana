/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { Mutable } from 'utility-types';
import {
  SentinelOneBaseApiResponseSchema,
  SentinelOneConfigSchema,
  SentinelOneExecuteScriptParamsSchema,
  SentinelOneGetAgentsParamsSchema,
  SentinelOneGetAgentsResponseSchema,
  SentinelOneGetRemoteScriptsParamsSchema,
  SentinelOneGetRemoteScriptsResponseSchema,
  SentinelOneGetRemoteScriptStatusParamsSchema,
  SentinelOneIsolateHostParamsSchema,
  SentinelOneSecretsSchema,
  SentinelOneActionParamsSchema,
  SentinelOneFetchAgentFilesParamsSchema,
  SentinelOneFetchAgentFilesResponseSchema,
  SentinelOneDownloadAgentFileParamsSchema,
  SentinelOneGetActivitiesParamsSchema,
  SentinelOneGetActivitiesResponseSchema,
  SentinelOneExecuteScriptResponseSchema,
  SentinelOneGetRemoteScriptResultsParamsSchema,
  SentinelOneDownloadRemoteScriptResultsParamsSchema,
} from './schema';

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

export type SentinelOneConfig = TypeOf<typeof SentinelOneConfigSchema>;
export type SentinelOneSecrets = TypeOf<typeof SentinelOneSecretsSchema>;

export type SentinelOneBaseApiResponse = TypeOf<typeof SentinelOneBaseApiResponseSchema>;

export type SentinelOneGetAgentsParams = Partial<TypeOf<typeof SentinelOneGetAgentsParamsSchema>>;
export type SentinelOneGetAgentsResponse = TypeOf<typeof SentinelOneGetAgentsResponseSchema>;

export type SentinelOneExecuteScriptParams = TypeOf<typeof SentinelOneExecuteScriptParamsSchema>;
export type SentinelOneExecuteScriptResponse = TypeOf<
  typeof SentinelOneExecuteScriptResponseSchema
>;

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

export type SentinelOneGetRemoteScriptStatusParams = TypeOf<
  typeof SentinelOneGetRemoteScriptStatusParamsSchema
>;

export interface SentinelOneGetRemoteScriptStatusApiResponse
  extends SentinelOnePagination,
    SentinelOneErrors {
  data: SentinelOneRemoteScriptExecutionStatus[];
}

export type SentinelOneGetRemoteScriptResultsParams = TypeOf<
  typeof SentinelOneGetRemoteScriptResultsParamsSchema
>;

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

export type SentinelOneDownloadRemoteScriptResultsParams = TypeOf<
  typeof SentinelOneDownloadRemoteScriptResultsParamsSchema
>;

export type SentinelOneGetRemoteScriptsParams = TypeOf<
  typeof SentinelOneGetRemoteScriptsParamsSchema
>;

export type SentinelOneGetRemoteScriptsResponse = TypeOf<
  typeof SentinelOneGetRemoteScriptsResponseSchema
>;

export type SentinelOneFetchAgentFilesParams = Mutable<
  TypeOf<typeof SentinelOneFetchAgentFilesParamsSchema>
>;
export type SentinelOneFetchAgentFilesResponse = TypeOf<
  typeof SentinelOneFetchAgentFilesResponseSchema
>;

export type SentinelOneDownloadAgentFileParams = Mutable<
  TypeOf<typeof SentinelOneDownloadAgentFileParamsSchema>
>;

export type SentinelOneActivityRecord<TData = unknown> = Omit<
  TypeOf<typeof SentinelOneGetActivitiesResponseSchema>['data'][number],
  'data'
> & {
  data: TData;
};

export type SentinelOneGetActivitiesParams = TypeOf<typeof SentinelOneGetActivitiesParamsSchema>;

export type SentinelOneGetActivitiesResponse<TData = unknown> = Omit<
  TypeOf<typeof SentinelOneGetActivitiesResponseSchema>,
  'data'
> & { data: Array<SentinelOneActivityRecord<TData>> };

export type SentinelOneIsolateHostParams = Partial<
  Mutable<TypeOf<typeof SentinelOneIsolateHostParamsSchema>>
>;

export type SentinelOneActionParams = TypeOf<typeof SentinelOneActionParamsSchema>;
