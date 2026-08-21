/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Default Jest mocks for APM hooks that require a typed router or route params.
 *
 * Loaded for every APM unit test via `jest.config.js` → `setupFilesAfterEnv`.
 * Individual test files can still override these with their own hoisted
 * `jest.mock()` (e.g. `use_service_map_alerts_tab_href.test.ts`).
 *
 * Prevents intermittent "Router not found in context" when per-file mocks do
 * not apply under full-shard CI runs (Storybook setup + module load order).
 */

const defaultApmQuery = {
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  environment: 'ENVIRONMENT_ALL',
  kuery: '',
};

jest.mock('../public/hooks/use_apm_router', () => ({
  useApmRouter: jest.fn(() => ({
    link: jest.fn(() => '/app/apm'),
    push: jest.fn(),
    replace: jest.fn(),
  })),
}));

jest.mock('../public/hooks/use_apm_params', () => ({
  useMaybeApmParams: jest.fn(() => undefined),
  useApmParams: jest.fn(() => ({ query: defaultApmQuery })),
  useAnyOfApmParams: jest.fn(() => ({ query: defaultApmQuery })),
}));
