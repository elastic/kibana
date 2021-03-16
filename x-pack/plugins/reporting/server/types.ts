/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest, RequestHandlerContext } from 'src/core/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { DataPluginStart } from 'src/plugins/data/server/plugin';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { AuthenticatedUser, SecurityPluginSetup } from '../../security/server';
import { SpacesPluginSetup } from '../../spaces/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import { CancellationToken } from '../common';
import { BaseParams, TaskRunResult } from '../common/types';
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
  security?: SecurityPluginSetup;
  spaces?: SpacesPluginSetup;
  taskManager: TaskManagerSetupContract;
  usageCollection?: UsageCollectionSetup;
}

export interface ReportingStartDeps {
  data: DataPluginStart;
  taskManager: TaskManagerStartContract;
}

export type ReportingStart = object;
export type ReportingSetup = object;

/*
 * Internal Types
 */

export type ReportingUser = { username: AuthenticatedUser['username'] } | false;

export type CaptureConfig = ReportingConfigType['capture'];
export type ScrollConfig = ReportingConfigType['csv']['scroll'];

export { BaseParams };

// base params decorated with encrypted headers that come into runJob functions
export interface BasePayload extends BaseParams {
  headers: string;
  spaceId?: string;
}

// default fn type for CreateJobFnFactory
export type CreateJobFn<JobParamsType = BaseParams, JobPayloadType = BasePayload> = (
  jobParams: JobParamsType,
  context: ReportingRequestHandlerContext,
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

/**
 * @internal
 */
export interface ReportingRequestHandlerContext extends RequestHandlerContext {
  reporting: ReportingStart | null;
}

/**
 * @internal
 */
export type ReportingPluginRouter = IRouter<ReportingRequestHandlerContext>;
