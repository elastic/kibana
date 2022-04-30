/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Report } from './report';

describe('Class Report', () => {
  it('constructs Report instance', () => {
    const report = new Report({
      _index: '.reporting-test-index-12345',
      jobtype: 'test-report',
      created_by: 'created_by_test_string',
      max_attempts: 50,
      payload: {
        headers: 'payload_test_field',
        objectType: 'testOt',
        title: 'cool report',
        version: '7.14.0',
        browserTimezone: 'UTC',
      },
      meta: { objectType: 'test' },
      timeout: 30000,
    });

    expect(report.toReportSource()).toMatchObject({
      attempts: 0,
      completed_at: undefined,
      created_by: 'created_by_test_string',
      jobtype: 'test-report',
      max_attempts: 50,
      meta: { objectType: 'test' },
      payload: { headers: 'payload_test_field', objectType: 'testOt' },
      started_at: undefined,
      status: 'pending',
      timeout: 30000,
    });
    expect(report.toReportTaskJSON()).toMatchObject({
      attempts: 0,
      created_by: 'created_by_test_string',
      index: '.reporting-test-index-12345',
      jobtype: 'test-report',
      meta: { objectType: 'test' },
      payload: { headers: 'payload_test_field', objectType: 'testOt' },
    });
    expect(report.toApiJSON()).toMatchObject({
      attempts: 0,
      created_by: 'created_by_test_string',
      index: '.reporting-test-index-12345',
      jobtype: 'test-report',
      max_attempts: 50,
      payload: { objectType: 'testOt' },
      meta: { objectType: 'test' },
      status: 'pending',
      timeout: 30000,
    });

    expect(report._id).toBeDefined();
  });

  it('updateWithEsDoc method syncs fields to sync ES metadata', () => {
    const report = new Report({
      _index: '.reporting-test-index-12345',
      jobtype: 'test-report',
      created_by: 'created_by_test_string',
      max_attempts: 50,
      payload: {
        headers: 'payload_test_field',
        objectType: 'testOt',
        title: 'hot report',
        version: '7.14.0',
        browserTimezone: 'UTC',
      },
      meta: { objectType: 'stange' },
      timeout: 30000,
    });

    const metadata = {
      _index: '.reporting-test-update',
      _id: '12342p9o387549o2345',
      _primary_term: 77,
      _seq_no: 99,
    };
    report.updateWithEsDoc(metadata);

    expect(report.toReportSource()).toMatchObject({
      attempts: 0,
      completed_at: undefined,
      created_by: 'created_by_test_string',
      jobtype: 'test-report',
      max_attempts: 50,
      meta: { objectType: 'stange' },
      payload: { objectType: 'testOt' },
      started_at: undefined,
      status: 'pending',
      timeout: 30000,
    });
    expect(report.toReportTaskJSON()).toMatchObject({
      attempts: 0,
      created_by: 'created_by_test_string',
      id: '12342p9o387549o2345',
      index: '.reporting-test-update',
      jobtype: 'test-report',
      meta: { objectType: 'stange' },
      payload: { objectType: 'testOt' },
    });
    expect(report.toApiJSON()).toMatchObject({
      attempts: 0,
      completed_at: undefined,
      created_by: 'created_by_test_string',
      id: '12342p9o387549o2345',
      index: '.reporting-test-update',
      jobtype: 'test-report',
      max_attempts: 50,
      meta: { objectType: 'stange' },
      payload: { objectType: 'testOt' },
      started_at: undefined,
      status: 'pending',
      timeout: 30000,
    });
  });

  it('throws error if converted to task JSON before being synced with ES storage', () => {
    const report = new Report({ jobtype: 'spam', payload: {} } as any);
    expect(() => report.updateWithEsDoc(report)).toThrowErrorMatchingInlineSnapshot(
      `"Report object from ES has missing fields!"`
    );
  });
});
