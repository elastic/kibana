/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Report } from './report';

describe('Class Report', () => {
  it('constructs Report instance', () => {
    const opts = {
      index: '.reporting-test-index-12345',
      jobtype: 'test-report',
      created_by: 'created_by_test_string',
      browser_type: 'browser_type_test_string',
      max_attempts: 50,
      payload: { payload_test_field: 1 },
      timeout: 30000,
      priority: 1,
    };
    const report = new Report(opts);
    expect(report).toMatchObject({
      _primary_term: undefined,
      _seq_no: undefined,
      browser_type: 'browser_type_test_string',
      created_by: 'created_by_test_string',
      jobtype: 'test-report',
      max_attempts: 50,
      payload: {
        payload_test_field: 1,
      },
      priority: 1,
      timeout: 30000,
    });

    expect(report.id).toBeDefined();
  });
});
