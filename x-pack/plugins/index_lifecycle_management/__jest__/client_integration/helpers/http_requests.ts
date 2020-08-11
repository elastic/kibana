/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fakeServer, SinonFakeServer } from 'sinon';
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

  const setLoadSnapshotPolicies = (response: any = [], error?: { status: number; body: any }) => {
    const status = error ? error.status : 200;
    const body = error ? error.body : response;

    server.respondWith('GET', `${API_BASE_PATH}/snapshot_policies`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  return {
    setLoadPolicies,
    setLoadSnapshotPolicies,
  };
};
