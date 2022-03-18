/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetTrustedAppsListResponse } from '../../../../../common/endpoint/types';
import { createSampleTrustedApps } from '../../trusted_apps/test_utils';

export const getMockListResponse: () => GetTrustedAppsListResponse = () => ({
  data: createSampleTrustedApps({}),
  per_page: 100,
  page: 1,
  total: 100,
});
