/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';

import { docLinksServiceMock } from '../../../../../../../src/core/public/mocks';
import { setHttpClient } from '../../../app/services/api';
import { init as initDocumentation } from '../../../app/services/documentation_links';
import { init as initHttpRequests } from './http_requests';

export const setupEnvironment = () => {
  // axios has a similar interface to HttpSetup, but we
  // flatten out the response.
  const client = axios.create({ adapter: axiosXhrAdapter });
  client.interceptors.response.use(({ data }) => data);
  setHttpClient(client);
  initDocumentation(docLinksServiceMock.createStartContract());

  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};
