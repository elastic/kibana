/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';
import { init as initHttpRequests } from './http_requests';
import { setHttpClient, setSavedObjectsClient } from '../../../public/application/lib/api';

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });
mockHttpClient.interceptors.response.use(
  (res) => {
    return res.data;
  },
  (rej) => {
    return Promise.reject(rej);
  }
);

const mockSavedObjectsClient = () => {
  return {
    find: (_params?: any) => {},
  };
};

export const setupEnvironment = () => {
  const { server, httpRequestsMockHelpers } = initHttpRequests();

  // @ts-ignore
  setHttpClient(mockHttpClient);

  setSavedObjectsClient(mockSavedObjectsClient() as any);

  return {
    server,
    httpRequestsMockHelpers,
  };
};
