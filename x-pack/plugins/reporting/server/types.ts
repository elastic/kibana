/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest, RequestHandlerContext } from 'src/core/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { DataPluginStart } from 'src/plugins/data/server/plugin';
import { ScreenshotModePluginSetup } from 'src/plugins/screenshot_mode/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { Writable } from 'stream';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { AuthenticatedUser, SecurityPluginSetup } from '../../security/server';
import { SpacesPluginSetup } from '../../spaces/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import { CancellationToken } from '../common';
import {
  BaseParams,
  BaseParamsImmediate,
  BasePayload,
  JobType,
  TaskRunResult,
} from '../common/types';
import { ReportingConfigType } from './config';
import { ReportingCore } from './core';
import { LevelLogger } from './lib';
import { ReportTaskParams } from './lib/tasks';

/*
 * Plugin Contract
 */

export interface ReportingSetupDeps {
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
  screenshotMode: ScreenshotModePluginSetup;
  security?: SecurityPluginSetup;
  spaces?: SpacesPluginSetup;
  taskManager: TaskManagerSetupContract;
  usageCollection?: UsageCollectionSetup;
}

export interface ReportingStartDeps {
  data: DataPluginStart;
  taskManager: TaskManagerStartContract;
}

export interface ReportingSetup {
  usesUiCapabilities: () => boolean;
}

export type ReportingStart = ReportingSetup;

/*
 * Internal Types
 */

export type ReportingUser = { username: AuthenticatedUser['username'] } | false;

export type CaptureConfig = ReportingConfigType['capture'];
export type ScrollConfig = ReportingConfigType['csv']['scroll'];

export { BaseParams, BasePayload, BaseParamsImmediate };

// default fn type for CreateJobFnFactory
export type CreateJobFn<
  JobParamsType extends BaseParams = BaseParams,
  JobPayloadType extends BasePayload = BasePayload
> = (
  jobParams: JobParamsType,
  context: ReportingRequestHandlerContext,
  request: KibanaRequest<any, any, any, any>
) => Promise<JobPayloadType>;

export type RunTaskFn<TaskPayloadType extends BasePayload = BasePayload> = (
  jobId: string,
  payload: ReportTaskParams<TaskPayloadType>['payload'],
  cancellationToken: CancellationToken,
  stream: Writable
) => Promise<TaskRunResult>;

export type ImmediateExecuteFn<JobParamsType extends BaseParamsImmediate = BaseParamsImmediate> = (
  jobId: null,
  job: JobParamsType,
  context: ReportingRequestHandlerContext,
  stream: Writable,
  req: KibanaRequest
) => Promise<TaskRunResult>;

export type CreateJobFnFactory<CreateJobFnType> = (
  reporting: ReportingCore,
  logger: LevelLogger
) => CreateJobFnType;

export type RunTaskFnFactory<RunTaskFnType> = (
  reporting: ReportingCore,
  logger: LevelLogger
) => RunTaskFnType;

interface BaseExportTypeInstance<RunTaskFnType> {
  id: string;
  name: string;
  jobType: JobType;
  jobContentEncoding?: string;
  jobContentExtension: string;
  runTaskFnFactory: RunTaskFnFactory<RunTaskFnType>;
  validLicenses: string[];
}

export type QueuedJobExportTypeInstance<
  CreateJobFnType = CreateJobFn,
  RunTaskFnType = RunTaskFn
> = BaseExportTypeInstance<RunTaskFnType> & {
  createJobFnFactory: RunTaskFnFactory<CreateJobFnType>;
};

export type ImmediateExportTypeInstance<
  RunTaskFnType = ImmediateExecuteFn
> = BaseExportTypeInstance<RunTaskFnType>;

export type ExportTypeDefinition<
  CreateJobFnType = CreateJobFn | null,
  RunTaskFnType = RunTaskFn | ImmediateExecuteFn,
  ExportTypeInstance =
    | QueuedJobExportTypeInstance<CreateJobFnType, RunTaskFnType>
    | ImmediateExportTypeInstance<RunTaskFnType>
> = ExportTypeInstance;

/**
 * @internal
 */
export interface ReportingRequestHandlerContext {
  reporting: ReportingStart | null;
  core: RequestHandlerContext['core'];
}

/**
 * @internal
 */
export type ReportingPluginRouter = IRouter<ReportingRequestHandlerContext>;
