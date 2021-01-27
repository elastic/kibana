/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup } from 'src/core/public';
import { ManagementAppMountParams } from 'src/plugins/management/public/';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';

import { FleetSetup } from '../../../fleet/public';
import { UIM_APP_NAME } from '../../common/constants';
import { PLUGIN } from '../../common/constants/plugin';
import { ExtensionsService } from '../services';
import { StartDependencies } from '../types';
import { AppDependencies } from './app_context';
import { breadcrumbService } from './services/breadcrumbs';
import { documentationService } from './services/documentation';
import { UiMetricService } from './services';

import { renderApp } from '.';
import { setUiMetricService } from './services/api';
import { notificationService } from './services/notification';
import { httpService } from './services/http';

function initSetup({
  usageCollection,
  coreSetup,
}: {
  coreSetup: CoreSetup<StartDependencies>;
  usageCollection: UsageCollectionSetup;
}) {
  const { http, notifications } = coreSetup;

  httpService.setup(http);
  notificationService.setup(notifications);

  const uiMetricService = new UiMetricService(UIM_APP_NAME);

  setUiMetricService(uiMetricService);

  uiMetricService.setup(usageCollection);

  return { uiMetricService };
}

export async function mountManagementSection(
  coreSetup: CoreSetup<StartDependencies>,
  usageCollection: UsageCollectionSetup,
  params: ManagementAppMountParams,
  extensionsService: ExtensionsService,
  fleet?: FleetSetup
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

  const { uiMetricService } = initSetup({
    usageCollection,
    coreSetup,
  });

  const appDependencies: AppDependencies = {
    core: {
      fatalErrors,
      getUrlForApp: application.getUrlForApp,
    },
    plugins: {
      usageCollection,
      fleet,
    },
    services: { httpService, notificationService, uiMetricService, extensionsService },
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
