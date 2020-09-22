/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { DataPluginStart } from 'src/plugins/data/server/plugin';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { SpacesPluginSetup } from '../../spaces/server';
import { CancellationToken } from '../../../plugins/reporting/common';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { AuthenticatedUser, SecurityPluginSetup } from '../../security/server';
import { ReportingConfigType } from './config';
import { ReportingCore } from './core';
import { LevelLogger } from './lib';
import { LayoutParams } from './lib/layouts';
import { ReportTaskParams, TaskRunResult } from './lib/tasks';

/*
 * Plugin Contract
 */

export interface ReportingSetupDeps {
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
  security?: SecurityPluginSetup;
  spaces?: SpacesPluginSetup;
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
  browserTimezone?: string; // browserTimezone is optional: it is not in old POST URLs that were generated prior to being added to this interface
  layout?: LayoutParams;
  objectType: string;
  title: string;
  savedObjectId?: string; // legacy (7.x) only
  queryString?: string; // legacy (7.x) only
}

// base params decorated with encrypted headers that come into runJob functions
export interface BasePayload extends BaseParams {
  headers: string;
  spaceId?: string;
}

// default fn type for CreateJobFnFactory
export type CreateJobFn<JobParamsType = BaseParams, JobPayloadType = BasePayload> = (
  jobParams: JobParamsType,
  context: RequestHandlerContext,
  request: KibanaRequest<any, any, any, any>
) => Promise<JobPayloadType>;

// default fn type for RunTaskFnFactory
export type RunTaskFn<TaskPayloadType = BasePayload> = (
  jobId: string,
  payload: ReportTaskParams<TaskPayloadType>['payload'],
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

export interface ExportTypeDefinition<CreateJobFnType = CreateJobFn, RunTaskFnType = RunTaskFn> {
  id: string;
  name: string;
  jobType: string;
  jobContentEncoding?: string;
  jobContentExtension: string;
  createJobFnFactory: CreateJobFnFactory<CreateJobFnType>;
  runTaskFnFactory: RunTaskFnFactory<RunTaskFnType>;
  validLicenses: string[];
}
