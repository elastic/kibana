/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApplicationStart,
  CoreStart,
  IUiSettingsClient,
  ThemeServiceSetup,
  ToastsSetup,
} from '@kbn/core/public';
import { OverlayStart } from '@kbn/core-overlays-browser';
import { ILicense } from '@kbn/licensing-plugin/public';
import type { LayoutParams } from '@kbn/screenshotting-plugin/common';
import { BrowserUrlService } from '@kbn/share-plugin/public';
import type { ReportingAPIClient } from '../lib/reporting_api_client';
export { reportingScreenshotShareProvider } from './register_pdf_png_reporting';

export { ReportingModalContent } from './reporting_panel_content_lazy';
export interface ExportPanelShareOpts {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  uiSettings: IUiSettingsClient;
  usesUiCapabilities: boolean;
  license: ILicense;
  application: ApplicationStart;
  theme: ThemeServiceSetup;
  overlays: OverlayStart;
  i18nStart: CoreStart['i18n'];
  urlService: BrowserUrlService;
}

export interface ReportingSharingData {
  title: string;
  layout: LayoutParams;
  reportingDisabled?: boolean;
  [key: string]: unknown;
}

export interface JobParamsProviderOptions {
  sharingData: ReportingSharingData;
  shareableUrl: string;
  objectType: string;
}
