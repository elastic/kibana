/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';

import { StartDependencies } from '../types';
import {
  documentationService,
  uiMetricService,
  apiService,
  breadcrumbService,
  fileReaderService,
} from './services';
import { renderApp } from '.';

export async function mountManagementSection(
  { http, getStartServices, notifications }: CoreSetup<StartDependencies>,
  params: ManagementAppMountParams
) {
  const { element, setBreadcrumbs, history, theme$ } = params;
  const [coreStart, depsStart] = await getStartServices();
  const {
    docLinks,
    application,
    i18n: { Context: I18nContext },
    executionContext,
  } = coreStart;

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
    share: depsStart.share,
    fileUpload: depsStart.fileUpload,
    application,
    executionContext,
  };

  return renderApp(element, I18nContext, services, { http }, { theme$ });
}
