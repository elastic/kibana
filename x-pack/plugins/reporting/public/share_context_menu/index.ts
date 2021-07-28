/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import type { IUiSettingsClient, ToastsSetup } from 'src/core/public';
import { CoreStart } from 'src/core/public';
import type { LicensingPluginSetup } from '../../../licensing/public';
import type { LayoutParams } from '../../common/types';
import type { ReportingAPIClient } from '../lib/reporting_api_client';

export interface ExportPanelShareOpts {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  license$: LicensingPluginSetup['license$'];
  startServices$: Rx.Observable<[CoreStart, object, unknown]>;
  uiSettings: IUiSettingsClient;
  usesUiCapabilities: boolean;
}

export interface ReportingSharingData {
  title: string;
  layout: LayoutParams;
}

export interface JobParamsProviderOptions {
  shareableUrl: string;
  apiClient: ReportingAPIClient;
  objectType: string;
  sharingData: ReportingSharingData;
}
