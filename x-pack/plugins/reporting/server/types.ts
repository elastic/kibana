/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { DataPluginStart } from 'src/plugins/data/server/plugin';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { CancellationToken } from '../../../plugins/reporting/common';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { AuthenticatedUser, SecurityPluginSetup } from '../../security/server';
import { JobStatus } from '../common/types';
import { ReportingConfigType } from './config';
import { ReportingCore } from './core';
import { LevelLogger } from './lib';
import { LayoutInstance } from './lib/layouts';

/*
 * Routing types
 */

export interface ReportingRequestPre {
  management: {
    jobTypes: string[];
  };
  user: string;
}

// generate a report with unparsed jobParams
export interface GenerateExportTypePayload {
  jobParams: string;
}

export type ReportingRequestPayload = GenerateExportTypePayload | JobParamPostPayload;

export interface TimeRangeParams {
  timezone: string;
  min?: Date | string | number | null;
  max?: Date | string | number | null;
}

// the "raw" data coming from the client, unencrypted
export interface JobParamPostPayload {
  timerange?: TimeRangeParams;
}

// the pre-processed, encrypted data ready for storage
export interface BasePayload<JobParamsType> {
  headers: string; // serialized encrypted headers
  jobParams: JobParamsType;
  title: string;
  type: string;
}

export interface JobSource<JobParamsType> {
  _id: string;
  _index: string;
  _source: {
    jobtype: string;
    output: TaskRunResult;
    payload: BasePayload<JobParamsType>;
    status: JobStatus;
  };
}

export interface TaskRunResult {
  content_type: string | null;
  content: string | null;
  csv_contains_formulas?: boolean;
  size: number;
  max_size_reached?: boolean;
  warnings?: string[];
}

interface ConditionalHeadersConditions {
  protocol: string;
  hostname: string;
  port: number;
  basePath: string;
}

export interface ConditionalHeaders {
  headers: Record<string, string>;
  conditions: ConditionalHeadersConditions;
}

/*
 * Plugin Contract
 */

export interface ReportingSetupDeps {
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
  security?: SecurityPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface ReportingStartDeps {
  data: DataPluginStart;
}

export type ReportingStart = object;
export type ReportingSetup = object;

/*
 * Internal Types
 */

export type ReportingUser = { username: AuthenticatedUser['username'] } | false;

export type CaptureConfig = ReportingConfigType['capture'];
export type ScrollConfig = ReportingConfigType['csv']['scroll'];

export interface BaseParams {
  browserTimezone: string;
  layout?: LayoutInstance; // for screenshot type reports
  objectType: string;
}

export interface BaseParamsEncryptedFields extends BaseParams {
  basePath?: string; // for screenshot type reports
  headers: string; // encrypted headers
}

export type CreateJobFn<JobParamsType extends BaseParams> = (
  jobParams: JobParamsType,
  context: RequestHandlerContext,
  request: KibanaRequest
) => Promise<JobParamsType & BaseParamsEncryptedFields>;

export type RunTaskFn<TaskPayloadType> = (
  jobId: string,
  job: TaskPayloadType,
  cancellationToken: CancellationToken
) => Promise<TaskRunResult>;

export type CreateJobFnFactory<CreateJobFnType> = (
  reporting: ReportingCore,
  logger: LevelLogger
) => CreateJobFnType;

export type RunTaskFnFactory<RunTaskFnType> = (
  reporting: ReportingCore,
  logger: LevelLogger
) => RunTaskFnType;

export interface ExportTypeDefinition<
  JobParamsType,
  CreateJobFnType,
  JobPayloadType,
  RunTaskFnType
> {
  id: string;
  name: string;
  jobType: string;
  jobContentEncoding?: string;
  jobContentExtension: string;
  createJobFnFactory: CreateJobFnFactory<CreateJobFnType>;
  runTaskFnFactory: RunTaskFnFactory<RunTaskFnType>;
  validLicenses: string[];
}

export interface DiagnosticResponse {
  help: string[];
  success: boolean;
  logs: string;
}
