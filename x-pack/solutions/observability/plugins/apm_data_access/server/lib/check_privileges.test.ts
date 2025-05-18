/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertIndiciesToPrivilege } from './check_privileges';

describe('test CheckPrivileges', () => {
  it('shourp properly convert apmIndices to privilege format', () => {
    const apmIndices = {
      transaction: 'traces-apm*,apm-*,traces-*.otel-*',
      span: 'traces-apm*,apm-*,traces-*.otel-*',
      error: 'logs-apm*,apm-*,logs-*.otel-*',
      metric: 'metrics-apm*,apm-*,metrics-*.otel-*',
      onboarding: 'apm-*',
      sourcemap: 'apm-*',
    };
    const expectedFormat = {
      'traces-apm*': ['read'],
      'apm-*': ['read'],
      'traces-*.otel-*': ['read'],
      'logs-apm*': ['read'],
      'logs-*.otel-*': ['read'],
      'metrics-apm*': ['read'],
      'metrics-*.otel-*': ['read'],
    };
    const result = convertIndiciesToPrivilege(apmIndices);
    expect(expectedFormat).toEqual(result);
  });
});
