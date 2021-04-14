/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'src/core/public';
import { ManagementAppMountParams } from '../../../../../src/plugins/management/public';
import { UA_READONLY_MODE } from '../../common/constants';
import { renderApp } from './render_app';
import { KibanaVersionContext } from './app_context';
import { apiService } from './lib/api';
import { breadcrumbService } from './lib/breadcrumbs';

export async function mountManagementSection(
  coreSetup: CoreSetup,
  isCloudEnabled: boolean,
  params: ManagementAppMountParams,
  kibanaVersionInfo: KibanaVersionContext
) {
  const [
    { i18n, docLinks, notifications, application, deprecations },
  ] = await coreSetup.getStartServices();

  const { element, history, setBreadcrumbs } = params;
  const { http } = coreSetup;

  apiService.setup(http);
  breadcrumbService.setup(setBreadcrumbs);

  return renderApp({
    element,
    isCloudEnabled,
    http,
    i18n,
    docLinks,
    kibanaVersionInfo,
    notifications,
    isReadOnlyMode: UA_READONLY_MODE,
    history,
    api: apiService,
    breadcrumbs: breadcrumbService,
    getUrlForApp: application.getUrlForApp,
    deprecations,
  });
}
