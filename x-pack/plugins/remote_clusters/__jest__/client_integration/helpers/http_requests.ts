/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon, { SinonFakeServer } from 'sinon';
import { Cluster } from '../../../common/lib';

// Register helpers to mock HTTP Requests
const registerHttpRequestMockHelpers = (server: SinonFakeServer) => {
  const mockResponse = (response: Cluster[] | { itemsDeleted: string[]; errors: string[] }) => [
    200,
    { 'Content-Type': 'application/json' },
    JSON.stringify(response),
  ];

  const setLoadRemoteClustersResponse = (response: Cluster[] = []) => {
    server.respondWith('GET', '/api/remote_clusters', mockResponse(response));
  };

  const setDeleteRemoteClusterResponse = (
    response: { itemsDeleted: string[]; errors: string[] } = { itemsDeleted: [], errors: [] }
  ) => {
    server.respondWith('DELETE', /api\/remote_clusters/, mockResponse(response));
  };

  return {
    setLoadRemoteClustersResponse,
    setDeleteRemoteClusterResponse,
  };
};

export const init = () => {
  const server = sinon.fakeServer.create();
  server.respondImmediately = true;

  // We make requests to APIs which don't impact the UX, e.g. UI metric telemetry,
  // and we can mock them all with a 200 instead of mocking each one individually.
  server.respondWith([200, {}, '']);

  return {
    server,
    httpRequestsMockHelpers: registerHttpRequestMockHelpers(server),
  };
};
