/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { createCspBenchmarkIntegrationFixture } from '../../test/fixtures/csp_benchmark_integration';
import { CspBenchmarkIntegration } from './types';

const QUERY_KEY = 'csp_benchmark_integrations';

const FAKE_DATA: CspBenchmarkIntegration[] = [
  createCspBenchmarkIntegrationFixture(),
  createCspBenchmarkIntegrationFixture(),
  createCspBenchmarkIntegrationFixture(),
  createCspBenchmarkIntegrationFixture(),
  createCspBenchmarkIntegrationFixture(),
];

// TODO: Use data from BE
export const useCspBenchmarkIntegrations = () => {
  return useQuery(QUERY_KEY, () => Promise.resolve(FAKE_DATA));
};
