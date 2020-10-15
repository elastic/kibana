/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';

import { setHttpClient } from '../../../app/services/api';
import { init as initHttpRequests } from './http_requests';

export const setupEnvironment = () => {
  // axios has a similar interface to HttpSetup, but we
  // flatten out the response.
  const client = axios.create({ adapter: axiosXhrAdapter });
  client.interceptors.response.use(({ data }) => data);
  setHttpClient(client);

  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};
