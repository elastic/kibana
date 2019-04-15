/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import sinon from 'sinon';

import { setHttpClient } from '../../../public/app/services/api';
import routing from '../../../public/app/services/routing';
import { registerHttpRequestMockHelpers } from './http_requests';

export const setupEnvironment = () => {
  // Mock React router
  const reactRouter = {
    history: {
      push: () => {},
      createHref: (location) => location.pathname,
      location: ''
    }
  };

  routing.reactRouter = reactRouter;
  // Mock Angular $q
  const $q = { defer: () => ({ resolve() {} }) };
  // axios has a $http like interface so using it to simulate $http
  setHttpClient(axios.create(), $q);

  const server = sinon.fakeServer.create();
  server.respondImmediately = true;

  // Mock all HTTP Requests that have not been handled previously
  server.respondWith([200, {}, '']);

  // Register helpers to mock Http Requests
  const httpRequestsMockHelpers = registerHttpRequestMockHelpers(server);

  return {
    server,
    httpRequestsMockHelpers,
  };
};
