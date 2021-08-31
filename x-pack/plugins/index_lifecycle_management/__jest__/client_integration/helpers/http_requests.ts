/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fakeServer, SinonFakeServer } from 'sinon';
import { API_BASE_PATH } from '../../../common/constants';
import {
  ListNodesRouteResponse,
  ListSnapshotReposResponse,
  NodesDetailsResponse,
} from '../../../common/types';
import { getDefaultHotPhasePolicy } from '../edit_policy/constants';

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

  const setListNodes = (body: ListNodesRouteResponse) => {
    server.respondWith('GET', `${API_BASE_PATH}/nodes/list`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setNodesDetails = (nodeAttributes: string, body: NodesDetailsResponse) => {
    server.respondWith('GET', `${API_BASE_PATH}/nodes/${nodeAttributes}/details`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setListSnapshotRepos = (body: ListSnapshotReposResponse) => {
    server.respondWith('GET', `${API_BASE_PATH}/snapshot_repositories`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setDefaultResponses = () => {
    setLoadPolicies([getDefaultHotPhasePolicy()]);
    setLoadSnapshotPolicies([]);
    setListSnapshotRepos({ repositories: ['abc'] });
    setListNodes({
      nodesByRoles: {},
      nodesByAttributes: { test: ['123'] },
      isUsingDeprecatedDataRoleConfig: false,
    });
  };

  return {
    setLoadPolicies,
    setLoadSnapshotPolicies,
    setListNodes,
    setNodesDetails,
    setListSnapshotRepos,
    setDefaultResponses,
  };
};
