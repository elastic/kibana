/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon, { SinonFakeServer } from 'sinon';

import { API_BASE_PATH } from '../../../common/constants';
import {
  CloudBackupStatus,
  ESUpgradeStatus,
  DeprecationLoggingStatus,
  ResponseError,
} from '../../../common/types';

// Register helpers to mock HTTP Requests
const registerHttpRequestMockHelpers = (server: SinonFakeServer) => {
  const setLoadCloudBackupStatusResponse = (
    response?: CloudBackupStatus,
    error?: ResponseError
  ) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;

    server.respondWith('GET', `${API_BASE_PATH}/cloud_backup_status`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setLoadEsDeprecationsResponse = (response?: ESUpgradeStatus, error?: ResponseError) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;

    server.respondWith('GET', `${API_BASE_PATH}/es_deprecations`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setLoadDeprecationLoggingResponse = (
    response?: DeprecationLoggingStatus,
    error?: ResponseError
  ) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;

    server.respondWith('GET', `${API_BASE_PATH}/deprecation_logging`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setLoadDeprecationLogsCountResponse = (
    response?: { count: number },
    error?: ResponseError
  ) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;

    server.respondWith('GET', `${API_BASE_PATH}/deprecation_logging/count`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setDeleteLogsCacheResponse = (response?: string, error?: ResponseError) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;
    server.respondWith('DELETE', `${API_BASE_PATH}/deprecation_logging/cache`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setUpdateDeprecationLoggingResponse = (
    response?: DeprecationLoggingStatus,
    error?: ResponseError
  ) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;

    server.respondWith('PUT', `${API_BASE_PATH}/deprecation_logging`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setUpdateIndexSettingsResponse = (response?: object, error?: ResponseError) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;
    server.respondWith('POST', `${API_BASE_PATH}/:indexName/index_settings`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setUpgradeMlSnapshotResponse = (response?: object, error?: ResponseError) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;

    server.respondWith('POST', `${API_BASE_PATH}/ml_snapshots`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setUpgradeMlSnapshotStatusResponse = (response?: object, error?: ResponseError) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;

    server.respondWith('GET', `${API_BASE_PATH}/ml_snapshots/:jobId/:snapshotId`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setReindexStatusResponse = (response?: object, error?: ResponseError) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;

    server.respondWith('GET', `${API_BASE_PATH}/reindex/:indexName`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setStartReindexingResponse = (response?: object, error?: ResponseError) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;

    server.respondWith('POST', `${API_BASE_PATH}/reindex/:indexName`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setDeleteMlSnapshotResponse = (response?: object, error?: ResponseError) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;

    server.respondWith('DELETE', `${API_BASE_PATH}/ml_snapshots/:jobId/:snapshotId`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setLoadSystemIndicesMigrationStatus = (response?: object, error?: ResponseError) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;

    server.respondWith('GET', `${API_BASE_PATH}/system_indices_migration`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setLoadMlUpgradeModeResponse = (response?: object, error?: ResponseError) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;

    server.respondWith('GET', `${API_BASE_PATH}/ml_upgrade_mode`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setSystemIndicesMigrationResponse = (response?: object, error?: ResponseError) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;

    server.respondWith('POST', `${API_BASE_PATH}/system_indices_migration`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setGetUpgradeStatusResponse = (response?: object, error?: ResponseError) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;

    server.respondWith('GET', `${API_BASE_PATH}/status`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  return {
    setLoadCloudBackupStatusResponse,
    setLoadEsDeprecationsResponse,
    setLoadDeprecationLoggingResponse,
    setUpdateDeprecationLoggingResponse,
    setUpdateIndexSettingsResponse,
    setUpgradeMlSnapshotResponse,
    setDeleteMlSnapshotResponse,
    setUpgradeMlSnapshotStatusResponse,
    setLoadDeprecationLogsCountResponse,
    setLoadSystemIndicesMigrationStatus,
    setSystemIndicesMigrationResponse,
    setDeleteLogsCacheResponse,
    setStartReindexingResponse,
    setReindexStatusResponse,
    setLoadMlUpgradeModeResponse,
    setGetUpgradeStatusResponse,
  };
};

export const init = () => {
  const server = sinon.fakeServer.create();
  server.respondImmediately = true;

  // Define default response for unhandled requests.
  // We make requests to APIs which don't impact the component under test, e.g. UI metric telemetry,
  // and we can mock them all with a 200 instead of mocking each one individually.
  server.respondWith([200, {}, 'DefaultMockedResponse']);

  const httpRequestsMockHelpers = registerHttpRequestMockHelpers(server);

  const setServerAsync = (isAsync: boolean, timeout: number = 200) => {
    if (isAsync) {
      server.autoRespond = true;
      server.autoRespondAfter = 1000;
      server.respondImmediately = false;
    } else {
      server.respondImmediately = true;
    }
  };

  return {
    server,
    setServerAsync,
    httpRequestsMockHelpers,
  };
};
