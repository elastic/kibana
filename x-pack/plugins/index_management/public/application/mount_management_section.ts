/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup } from 'src/core/public';
import { ManagementAppMountParams } from 'src/plugins/management/public/';

import { PLUGIN } from '../../common/constants';
import { ExtensionsService } from '../services';
import { StartDependencies, AppPluginsDependencies } from '../types';
import { AppDependencies } from './app_context';
import { breadcrumbService } from './services/breadcrumbs';
import { documentationService } from './services/documentation';
import { HttpService, NotificationService, UiMetricService } from './services';

import { renderApp } from '.';

interface InternalServices {
  httpService: HttpService;
  notificationService: NotificationService;
  uiMetricService: UiMetricService;
  extensionsService: ExtensionsService;
}

export async function mountManagementSection(
  coreSetup: CoreSetup<StartDependencies>,
  services: InternalServices,
  params: ManagementAppMountParams,
  plugins: AppPluginsDependencies
) {
  const { element, setBreadcrumbs, history } = params;
  const [core, startDependencies] = await coreSetup.getStartServices();
  const {
    docLinks,
    fatalErrors,
    application,
    chrome: { docTitle },
    uiSettings,
  } = core;

  const { urlGenerators } = startDependencies.share;
  docTitle.change(PLUGIN.getI18nName(i18n));

  breadcrumbService.setup(setBreadcrumbs);
  documentationService.setup(docLinks);

  const appDependencies: AppDependencies = {
    core: {
      fatalErrors,
      getUrlForApp: application.getUrlForApp,
    },
    plugins,
    services,
    history,
    setBreadcrumbs,
    uiSettings,
    urlGenerators,
    docLinks,
  };

  const unmountAppCallback = renderApp(element, { core, dependencies: appDependencies });

  return () => {
    docTitle.reset();
    unmountAppCallback();
  };
}
