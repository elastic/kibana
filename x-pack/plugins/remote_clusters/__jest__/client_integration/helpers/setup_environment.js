/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  notificationServiceMock,
  fatalErrorsServiceMock,
  docLinksServiceMock,
  injectedMetadataServiceMock,
} from '../../../../../../src/core/public/mocks';

import { usageCollectionPluginMock } from '../../../../../../src/plugins/usage_collection/public/mocks';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { HttpService } from '../../../../../../src/core/public/http';

/* eslint-disable @kbn/eslint/no-restricted-paths */
import { init as initBreadcrumb } from '../../../public/application/services/breadcrumb';
import { init as initHttp } from '../../../public/application/services/http';
import { init as initNotification } from '../../../public/application/services/notification';
import { init as initUiMetric } from '../../../public/application/services/ui_metric';
import { init as initDocumentation } from '../../../public/application/services/documentation';
import { init as initHttpRequests } from './http_requests';

export const setupEnvironment = () => {
  const httpServiceSetupMock = new HttpService().setup({
    injectedMetadata: injectedMetadataServiceMock.createSetupContract(),
    fatalErrors: fatalErrorsServiceMock.createSetupContract(),
  });

  initBreadcrumb(() => {});
  initDocumentation(docLinksServiceMock.createStartContract());
  initUiMetric(usageCollectionPluginMock.createSetupContract());
  initNotification(
    notificationServiceMock.createSetupContract().toasts,
    fatalErrorsServiceMock.createSetupContract()
  );
  initHttp(httpServiceSetupMock);

  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};
