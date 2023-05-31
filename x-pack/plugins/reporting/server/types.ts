/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext, IRouter, KibanaRequest } from '@kbn/core/server';
import type { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import type { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/server';
import type {
  PdfScreenshotOptions as BasePdfScreenshotOptions,
  PngScreenshotOptions as BasePngScreenshotOptions,
  ScreenshottingStart,
} from '@kbn/screenshotting-plugin/server';
import type {
  AuthenticatedUser,
  SecurityPluginSetup,
  SecurityPluginStart,
} from '@kbn/security-plugin/server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { Writable } from 'stream';
import type { CancellationToken, TaskRunResult } from '@kbn/reporting-common';
import type {
  BaseParams,
  BasePayload,
  JobParamsPDFV2,
  UrlOrUrlLocatorTuple,
} from '../common/types';
import type { ReportingConfigType } from './config';
import { ExportTypesRegistry } from './lib';
import { TaskPayloadPDFV2 } from './export_types/printable_pdf_v2';

/**
 * Plugin Setup Contract
 */
export interface ReportingSetup {
  /**
   * Used to inform plugins if Reporting config is compatible with UI Capabilities / Application Sub-Feature Controls
   */
  usesUiCapabilities: () => boolean;
  registerExportTypes: ExportTypesRegistry['register'];
}

/**
 * Plugin Start Contract
 */
export type ReportingStart = ReportingSetup;
export type ReportingUser = { username: AuthenticatedUser['username'] } | false;

export type ScrollConfig = ReportingConfigType['csv']['scroll'];

/**
 * Internal Types
 */

export type CreateJobFn = (
  jobParams: JobParamsPDFV2,
  context: ReportingRequestHandlerContext,
  req: KibanaRequest
) => { isDeprecated: boolean; browserTimezone: any };

export type RunTaskFn = (
  jobId: string,
  payload: TaskPayloadPDFV2,
  cancellationToken: CancellationToken,
  stream: Writable
) => Promise<TaskRunResult>;

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
  discover: DiscoverServerPluginStart;
  fieldFormats: FieldFormatsStart;
  licensing: LicensingPluginStart;
  screenshotting: ScreenshottingStart;
  security?: SecurityPluginStart;
  taskManager: TaskManagerStartContract;
}

export type ReportingRequestHandlerContext = CustomRequestHandlerContext<{
  reporting: ReportingStart | null;
}>;

export type ReportingPluginRouter = IRouter<ReportingRequestHandlerContext>;

export interface PdfScreenshotOptions extends Omit<BasePdfScreenshotOptions, 'timeouts' | 'urls'> {
  urls: UrlOrUrlLocatorTuple[];
}

export interface PngScreenshotOptions extends Omit<BasePngScreenshotOptions, 'timeouts' | 'urls'> {
  urls: UrlOrUrlLocatorTuple[];
}

export type { BaseParams, BasePayload };
