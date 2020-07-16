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
import { SecurityPluginSetup } from '../../security/server';
import { JobStatus } from '../common/types';
import { ReportingConfigType } from './config';
import { ReportingCore } from './core';
import { LevelLogger } from './lib';
import { LayoutInstance } from './lib/layouts';

/*
 * Routing / API types
 */

interface ListQuery {
  page: string;
  size: string;
  ids?: string; // optional field forbids us from extending RequestQuery
}

interface GenerateQuery {
  jobParams: string;
}

export type ReportingRequestQuery = ListQuery | GenerateQuery;

export interface ReportingRequestPre {
  management: {
    jobTypes: any;
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

export interface JobParamPostPayload {
  timerange?: TimeRangeParams;
}

export interface ScheduledTaskParams<JobParamsType> {
  headers?: string; // serialized encrypted headers
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
  content_type: string;
  content: string | null;
  size: number;
  csv_contains_formulas?: boolean;
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

export type CaptureConfig = ReportingConfigType['capture'];
export type ScrollConfig = ReportingConfigType['csv']['scroll'];

export type ESQueueCreateJobFn<JobParamsType> = (
  jobParams: JobParamsType,
  context: RequestHandlerContext,
  request: KibanaRequest
) => Promise<JobParamsType>;

export type ESQueueWorkerExecuteFn<ScheduledTaskParamsType> = (
  jobId: string,
  job: ScheduledTaskParamsType,
  cancellationToken: CancellationToken
) => Promise<any>;

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
