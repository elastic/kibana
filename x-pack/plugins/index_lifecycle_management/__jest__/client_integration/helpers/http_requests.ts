/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SinonFakeServer, fakeServer } from 'sinon';
import { API_BASE_PATH } from '../../../common/constants';

export const init = () => {
  const server = fakeServer.create();
  server.respondImmediately = true;
  server.respondWith([200, {}, 'DefaultServerResponse']);

  return {
    server,
    httpRequestsMockHelpers: registerHttpRequestMockHelpers(server),
  };
};

const registerHttpRequestMockHelpers = (server: SinonFakeServer) => {
  const setLoadPolicies = (response: any = []) => {
    server.respondWith('GET', `${API_BASE_PATH}/policies`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(response),
    ]);
  };

  return {
    setLoadPolicies,
  };
};
