/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { http, HttpResponse } from 'msw';
import { MOCK_SERVER_BASE_URL } from '../../../constants';
import * as benchmarks from './mocks/benchmarks.json';

export const defaultBenchmarks = http.get(
  `${MOCK_SERVER_BASE_URL}/internal/cloud_security_posture/benchmarks`,
  () => {
    return HttpResponse.json(benchmarks);
  }
);
