/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { merge } from 'lodash';

import { HttpSetup } from 'src/core/public';
import { docLinksServiceMock } from 'src/core/public/mocks';

import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import { notificationServiceMock, fatalErrorsServiceMock } from '@kbn/core/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { init as initHttp } from '../../../public/application/services/http';
import { init as initHttpRequests } from './http_requests';
import { init as initUiMetric } from '../../../public/application/services/ui_metric';
import { init as initNotification } from '../../../public/application/services/notification';
import { KibanaContextProvider } from '../../../public/shared_imports';
import { createBreadcrumbsMock } from '../../../public/application/services/breadcrumbs.mock';

const breadcrumbService = createBreadcrumbsMock();
const appContextMock = {
  breadcrumbService,
  license: licensingMock.createLicense({ license: { type: 'enterprise' } }),
  docLinks: docLinksServiceMock.createStartContract(),
  getUrlForApp: () => {},
};

export const WithAppDependencies =
  (Comp: any, httpSetup: HttpSetup, overrides: Record<string, unknown> = {}) =>
  (props: Record<string, unknown>) => {
    initHttp(httpSetup);
    breadcrumbService.setup(() => '');

    return (
      <KibanaContextProvider services={merge(appContextMock, overrides)}>
        <Comp {...props} />
      </KibanaContextProvider>
    );
  };

export const setupEnvironment = () => {
  initUiMetric(usageCollectionPluginMock.createSetupContract());
  initNotification(
    notificationServiceMock.createSetupContract().toasts,
    fatalErrorsServiceMock.createSetupContract()
  );

  return initHttpRequests();
};
