/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ToastsSetup } from '@kbn/core-notifications-browser';
import { HttpSetup } from '@kbn/core-http-browser';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { Observable } from 'rxjs';
import { ManagementAppMountParams, RegisterManagementAppArgs } from '@kbn/management-plugin/public';
import { ApplicationStart } from '@kbn/core-application-browser';
import { ExecutionContextStart } from '@kbn/core-execution-context-browser';
import { LicenseStatus } from '../types';
import { Settings } from './settings';

export interface AppDeps {
  toasts: ToastsSetup;
  http: HttpSetup;
  uiSettings: IUiSettingsClient;
  theme: ChartsPluginSetup['theme'];
  createTimeBuckets: () => any;
  licenseStatus$: Observable<LicenseStatus>;
  setBreadcrumbs: Parameters<RegisterManagementAppArgs['mount']>[0]['setBreadcrumbs'];
  history: ManagementAppMountParams['history'];
  getUrlForApp: ApplicationStart['getUrlForApp'];
  executionContext: ExecutionContextStart;
}

export const App = () => {
  return (
    <div>
      <Settings />
    </div>
  );
};
