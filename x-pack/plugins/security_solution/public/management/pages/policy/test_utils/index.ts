/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GetTrustedListAppsResponse,
  PostTrustedAppCreateResponse,
} from '../../../../../common/endpoint/types';

import { createSampleTrustedApps, createSampleTrustedApp } from '../../trusted_apps/test_utils';

export const getListResponse: () => GetTrustedListAppsResponse = () => ({
  data: createSampleTrustedApps({}),
  per_page: 100,
  page: 1,
  total: 100,
});

export const getFakeCreateResponse: () => PostTrustedAppCreateResponse = () =>
  createSampleTrustedApp(1) as unknown as unknown as PostTrustedAppCreateResponse;

export const getAPIError = () => ({
  statusCode: 500,
  error: 'Internal Server Error',
  message: 'Something is not right',
});
