/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup } from 'src/core/public';
import { ManagementAppMountParams } from 'src/plugins/management/public';

import { documentationService, uiMetricService, apiService, breadcrumbService } from './services';
import { renderApp } from '.';

export async function mountManagementSection(
  { http, getStartServices, notifications }: CoreSetup,
  params: ManagementAppMountParams
) {
  const { element, setBreadcrumbs, history } = params;
  const [coreStart] = await getStartServices();
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
  };

  return renderApp(element, I18nContext, services, { http });
}
