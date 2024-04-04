/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPathForFeedback } from './get_path_for_feedback';

describe('getPathForFeedback ', () => {
  const testData = [
    { value: `/ftw/app/apm/traces`, result: '/app/apm/traces' },
    { value: `/app/apm/traces`, result: '/app/apm/traces' },
    {
      value: `/ftw/app/apm/traces/frontend/transactions/view`,
      result: '/app/apm/traces*',
    },
    { value: `/app/apm/services`, result: '/app/apm/services' },
    {
      value: `/longer/path/before/app/apm/services`,
      result: '/app/apm/services',
    },
    {
      value: `/ftw/app/apm/services/long/path/after/services`,
      result: '/app/apm/services*',
    },
    {
      value: `/ftw/app/apm/dependencies/frontend/transactions/view`,
      result: '/app/apm/dependencies*',
    },
    { value: `/app/apm/dependencies`, result: '/app/apm/dependencies' },
    {
      value: `/ftw/app/apm/dependencies/frontend/transactions/view`,
      result: '/app/apm/dependencies*',
    },
    {
      value: `/ftw/app/apm/settings/frontend/transactions/view`,
      result: '/app/apm/settings*',
    },
    {
      value: `/app/apm/some-page/frontend/transactions/view`,
      result: '/app/apm/some-page*',
    },
    {
      value: `/app/apm/settings`,
      result: '/app/apm/settings',
    },
  ];

  it.each(testData)(
    'Returns correct path for the feedback form $value -> $result',
    ({ value, result }) => {
      expect(getPathForFeedback(value)).toBe(result);
    }
  );
});
