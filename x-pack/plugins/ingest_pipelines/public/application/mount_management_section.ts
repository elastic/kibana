/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';

import { StartDependencies, ILicense } from '../types';
import {
  documentationService,
  uiMetricService,
  apiService,
  breadcrumbService,
  fileReaderService,
} from './services';
import { renderApp } from '.';

export interface AppParams extends ManagementAppMountParams {
  license: ILicense | null;
}

export async function mountManagementSection(
  { http, getStartServices, notifications }: CoreSetup<StartDependencies>,
  params: AppParams
) {
  const { element, setBreadcrumbs, history, license } = params;
  const [coreStart, depsStart] = await getStartServices();
  const { docLinks, application, executionContext } = coreStart;

  documentationService.setup(docLinks);
  breadcrumbService.setup(setBreadcrumbs);

  const services = {
    breadcrumbs: breadcrumbService,
    metric: uiMetricService,
    documentation: documentationService,
    api: apiService,
    fileReader: fileReaderService,
    notifications,
    history,
    uiSettings: coreStart.uiSettings,
    settings: coreStart.settings,
    share: depsStart.share,
    fileUpload: depsStart.fileUpload,
    application,
    executionContext,
    license,
    consolePlugin: depsStart.console,
  };

  return renderApp(element, services, { ...coreStart, http });
}
