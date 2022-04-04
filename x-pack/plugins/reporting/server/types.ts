/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger, RequestHandlerContext } from 'kibana/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { DataPluginStart } from 'src/plugins/data/server/plugin';
import { FieldFormatsStart } from 'src/plugins/field_formats/server';
import type { ScreenshotModePluginSetup } from 'src/plugins/screenshot_mode/server';
import type { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import type { Writable } from 'stream';
import type { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import type { LicensingPluginStart } from '../../licensing/server';
import type {
  PngScreenshotOptions as BasePngScreenshotOptions,
  PdfScreenshotOptions as BasePdfScreenshotOptions,
  ScreenshottingStart,
} from '../../screenshotting/server';
import type {
  AuthenticatedUser,
  SecurityPluginSetup,
  SecurityPluginStart,
} from '../../security/server';
import type { SpacesPluginSetup } from '../../spaces/server';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import type { CancellationToken } from '../common/cancellation_token';
import type { BaseParams, BasePayload, TaskRunResult, UrlOrUrlLocatorTuple } from '../common/types';
import type { ReportingConfigType } from './config';
import type { ReportingCore } from './core';
import type { ReportTaskParams } from './lib/tasks';

/**
 * Plugin Setup Contract
 */
export interface ReportingSetup {
  /**
   * Used to inform plugins if Reporting config is compatible with UI Capabilities / Application Sub-Feature Controls
   */
  usesUiCapabilities: () => boolean;
}

/**
 * Plugin Start Contract
 */
export type ReportingStart = ReportingSetup;
export type ReportingUser = { username: AuthenticatedUser['username'] } | false;

export type CaptureConfig = ReportingConfigType['capture'];
export type ScrollConfig = ReportingConfigType['csv']['scroll'];

/**
 * Internal Types
 */

// default fn type for CreateJobFnFactory
export type CreateJobFn<JobParamsType = BaseParams, JobPayloadType = BasePayload> = (
  jobParams: JobParamsType,
  context: ReportingRequestHandlerContext
) => Promise<Omit<JobPayloadType, 'headers' | 'spaceId'>>;

// default fn type for RunTaskFnFactory
export type RunTaskFn<TaskPayloadType = BasePayload> = (
  jobId: string,
  payload: ReportTaskParams<TaskPayloadType>['payload'],
  cancellationToken: CancellationToken,
  stream: Writable
) => Promise<TaskRunResult>;

export type CreateJobFnFactory<CreateJobFnType> = (
  reporting: ReportingCore,
  logger: Logger
) => CreateJobFnType;

export type RunTaskFnFactory<RunTaskFnType> = (
  reporting: ReportingCore,
  logger: Logger
) => RunTaskFnType;

export interface ExportTypeDefinition<
  CreateJobFnType = CreateJobFn | null,
  RunTaskFnType = RunTaskFn
> {
  id: string;
  name: string;
  jobType: string;
  jobContentEncoding?: string;
  jobContentExtension: string;
  createJobFnFactory: CreateJobFnFactory<CreateJobFnType> | null; // immediate job does not have a "create" phase
  runTaskFnFactory: RunTaskFnFactory<RunTaskFnType>;
  validLicenses: string[];
}

export interface ReportingSetupDeps {
  features: FeaturesPluginSetup;
  screenshotMode: ScreenshotModePluginSetup;
  security?: SecurityPluginSetup;
  spaces?: SpacesPluginSetup;
  taskManager: TaskManagerSetupContract;
  usageCollection?: UsageCollectionSetup;
}

export interface ReportingStartDeps {
  data: DataPluginStart;
  fieldFormats: FieldFormatsStart;
  licensing: LicensingPluginStart;
  screenshotting: ScreenshottingStart;
  security?: SecurityPluginStart;
  taskManager: TaskManagerStartContract;
}

export interface ReportingRequestHandlerContext {
  reporting: ReportingStart | null;
  core: RequestHandlerContext['core'];
}

export type ReportingPluginRouter = IRouter<ReportingRequestHandlerContext>;

export interface PdfScreenshotOptions extends Omit<BasePdfScreenshotOptions, 'timeouts' | 'urls'> {
  urls: UrlOrUrlLocatorTuple[];
}

export interface PngScreenshotOptions extends Omit<BasePngScreenshotOptions, 'timeouts' | 'urls'> {
  urls: UrlOrUrlLocatorTuple[];
}

export type { BaseParams, BasePayload };
