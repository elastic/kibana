/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'src/core/public';
import { ManagementAppMountParams } from 'src/plugins/management/public';

import { StartDependencies } from '../types';
import { documentationService, uiMetricService, apiService, breadcrumbService } from './services';
import { renderApp } from '.';

export async function mountManagementSection(
  { http, getStartServices, notifications }: CoreSetup<StartDependencies>,
  params: ManagementAppMountParams
) {
  const { element, setBreadcrumbs, history } = params;
  const [coreStart, depsStart] = await getStartServices();
  const {
    docLinks,
    i18n: { Context: I18nContext },
  } = coreStart;

  documentationService.setup(docLinks);
  breadcrumbService.setup(setBreadcrumbs);

  const services = {
    breadcrumbs: breadcrumbService,
    metric: uiMetricService,
    documentation: documentationService,
    api: apiService,
    notifications,
    history,
    uiSettings: coreStart.uiSettings,
    urlGenerators: depsStart.share.urlGenerators,
  };

  return renderApp(element, I18nContext, services, { http });
}
