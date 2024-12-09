/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { IRouter } from '@kbn/core-http-server';
import type { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import type { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { UrlOrUrlLocatorTuple } from '@kbn/reporting-common/types';
import type { ReportApiJSON } from '@kbn/reporting-common/types';
import type { ReportingConfigType } from '@kbn/reporting-server';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/server';
import type {
  PdfScreenshotOptions as BasePdfScreenshotOptions,
  PngScreenshotOptions as BasePngScreenshotOptions,
  ScreenshottingStart,
} from '@kbn/screenshotting-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

import { ExportTypesRegistry } from '@kbn/reporting-server/export_types_registry';
import type { AuthenticatedUser } from '@kbn/core-security-common';

/**
 * Plugin Setup Contract
 */
export interface ReportingSetup {
  registerExportTypes: ExportTypesRegistry['register'];
}

/**
 * Plugin Start Contract
 */
export type ReportingStart = ReportingSetup;
export type ReportingUser = { username: AuthenticatedUser['username'] } | false;

export type ScrollConfig = ReportingConfigType['csv']['scroll'];

export interface ReportingSetupDeps {
  features: FeaturesPluginSetup;
  screenshotMode: ScreenshotModePluginSetup;
  taskManager: TaskManagerSetupContract;
  security?: SecurityPluginSetup;
  spaces?: SpacesPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface ReportingStartDeps {
  data: DataPluginStart;
  discover: DiscoverServerPluginStart;
  fieldFormats: FieldFormatsStart;
  licensing: LicensingPluginStart;
  taskManager: TaskManagerStartContract;
  screenshotting?: ScreenshottingStart;
}

export type ReportingRequestHandlerContext = CustomRequestHandlerContext<{
  reporting: ReportingStart | null;
}>;

export type ReportingPluginRouter = IRouter<ReportingRequestHandlerContext>;

/**
 * Interface of a response to an HTTP request for our plugin to generate a report.
 * @public
 */
export interface ReportingJobResponse {
  /**
   * Contractual field with Watcher: used to automate download of the report once it is finished
   * @public
   */
  path: string;
  /**
   * Details of a new report job that was requested
   * @public
   */
  job: ReportApiJSON;
}

export interface PdfScreenshotOptions extends Omit<BasePdfScreenshotOptions, 'timeouts' | 'urls'> {
  urls: UrlOrUrlLocatorTuple[];
}

export interface PngScreenshotOptions extends Omit<BasePngScreenshotOptions, 'timeouts' | 'urls'> {
  urls: UrlOrUrlLocatorTuple[];
}
