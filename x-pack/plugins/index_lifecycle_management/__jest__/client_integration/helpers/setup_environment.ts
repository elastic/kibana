/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';

import { init as initHttp } from '../../../public/application/services/http';
import { init as initHttpRequests } from './http_requests';
import { init as initUiMetric } from '../../../public/application/services/ui_metric';
import { init as initNotification } from '../../../public/application/services/notification';

import { usageCollectionPluginMock } from '../../../../../../src/plugins/usage_collection/public/mocks';

import {
  notificationServiceMock,
  fatalErrorsServiceMock,
} from '../../../../../../src/core/public/mocks';

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

export const setupEnvironment = () => {
  initUiMetric(usageCollectionPluginMock.createSetupContract());
  initNotification(
    notificationServiceMock.createSetupContract().toasts,
    fatalErrorsServiceMock.createSetupContract()
  );

  mockHttpClient.interceptors.response.use(({ data }) => data);
  initHttp(mockHttpClient);
  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};
