/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { DataPluginStart } from 'src/plugins/data/server/plugin';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { CancellationToken } from '../../../plugins/reporting/common';
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
export interface ScheduledTaskParams<JobParamsType> {
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
    payload: ScheduledTaskParams<JobParamsType>;
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
 * Screenshots
 */

export interface ScreenshotObservableOpts {
  logger: LevelLogger;
  urls: string[];
  conditionalHeaders: ConditionalHeaders;
  layout: LayoutInstance;
  browserTimezone: string;
}

export interface AttributesMap {
  [key: string]: any;
}

export interface ElementPosition {
  boundingClientRect: {
    // modern browsers support x/y, but older ones don't
    top: number;
    left: number;
    width: number;
    height: number;
  };
  scroll: {
    x: number;
    y: number;
  };
}

export interface ElementsPositionAndAttribute {
  position: ElementPosition;
  attributes: AttributesMap;
}

export interface Screenshot {
  base64EncodedData: string;
  title: string;
  description: string;
}

export interface ScreenshotResults {
  timeRange: string | null;
  screenshots: Screenshot[];
  error?: Error;
  elementsPositionAndAttributes?: ElementsPositionAndAttribute[]; // NOTE: for testing
}

export type ScreenshotsObservableFn = ({
  logger,
  urls,
  conditionalHeaders,
  layout,
  browserTimezone,
}: ScreenshotObservableOpts) => Rx.Observable<ScreenshotResults[]>;

/*
 * Plugin Contract
 */

export interface ReportingSetupDeps {
  licensing: LicensingPluginSetup;
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

export interface CreateJobBaseParams {
  browserTimezone: string;
  layout?: LayoutInstance; // for screenshot type reports
  objectType: string;
}

export interface CreateJobBaseParamsEncryptedFields extends CreateJobBaseParams {
  basePath?: string; // for screenshot type reports
  headers: string; // encrypted headers
}

export type CreateJobFn<JobParamsType extends CreateJobBaseParams> = (
  jobParams: JobParamsType,
  context: RequestHandlerContext,
  request: KibanaRequest
) => Promise<JobParamsType & CreateJobBaseParamsEncryptedFields>;

// rename me
export type WorkerExecuteFn<ScheduledTaskParamsType> = (
  jobId: string,
  job: ScheduledTaskParamsType,
  cancellationToken: CancellationToken
) => Promise<TaskRunResult>;

export type ScheduleTaskFnFactory<ScheduleTaskFnType> = (
  reporting: ReportingCore,
  logger: LevelLogger
) => ScheduleTaskFnType;

export type RunTaskFnFactory<RunTaskFnType> = (
  reporting: ReportingCore,
  logger: LevelLogger
) => RunTaskFnType;

export interface ExportTypeDefinition<
  JobParamsType,
  ScheduleTaskFnType,
  JobPayloadType,
  RunTaskFnType
> {
  id: string;
  name: string;
  jobType: string;
  jobContentEncoding?: string;
  jobContentExtension: string;
  scheduleTaskFnFactory: ScheduleTaskFnFactory<ScheduleTaskFnType>;
  runTaskFnFactory: RunTaskFnFactory<RunTaskFnType>;
  validLicenses: string[];
}
