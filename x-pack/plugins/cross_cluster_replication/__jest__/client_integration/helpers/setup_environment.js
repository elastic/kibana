/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';

import { setHttpClient } from '../../../public/app/services/api';
import { init as initHttpRequests } from './http_requests';

export const setupEnvironment = () => {
  // Mock Angular $q
  const $q = { defer: () => ({ resolve() {} }) };
  // axios has a $http like interface so using it to simulate $http
  setHttpClient(axios.create({ adapter: axiosXhrAdapter }), $q);

  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};
