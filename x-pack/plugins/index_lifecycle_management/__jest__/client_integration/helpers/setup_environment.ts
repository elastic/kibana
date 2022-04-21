/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';

import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import { notificationServiceMock, fatalErrorsServiceMock } from '@kbn/core/public/mocks';
import { init as initHttp } from '../../../public/application/services/http';
import { init as initHttpRequests } from './http_requests';
import { init as initUiMetric } from '../../../public/application/services/ui_metric';
import { init as initNotification } from '../../../public/application/services/notification';

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

export const setupEnvironment = () => {
  initUiMetric(usageCollectionPluginMock.createSetupContract());
  initNotification(
    notificationServiceMock.createSetupContract().toasts,
    fatalErrorsServiceMock.createSetupContract()
  );

  mockHttpClient.interceptors.response.use(({ data }) => data);
  // This expects HttpSetup but we're giving it AxiosInstance.
  // @ts-ignore
  initHttp(mockHttpClient);
  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};
