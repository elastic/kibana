/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApplicationStart,
  IUiSettingsClient,
  ThemeServiceSetup,
  ToastsSetup,
} from 'src/core/public';
import { ILicense } from '../../../licensing/public';
import type { LayoutParams } from '../../../screenshotting/common';
import type { ReportingAPIClient } from '../lib/reporting_api_client';

export interface ExportPanelShareOpts {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  uiSettings: IUiSettingsClient;
  usesUiCapabilities: boolean;
  license: ILicense;
  application: ApplicationStart;
  theme: ThemeServiceSetup;
}

export interface ReportingSharingData {
  title: string;
  layout: LayoutParams;
  [key: string]: unknown;
}

export interface JobParamsProviderOptions {
  sharingData: ReportingSharingData;
  shareableUrl: string;
  objectType: string;
}
