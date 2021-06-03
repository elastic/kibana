/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import { ElasticsearchClient } from 'src/core/server';
import { ReportingCore } from '../../';
import {
  createMockConfigSchema,
  createMockLevelLogger,
  createMockReportingCore,
} from '../../test_helpers';
import { Report, ReportDocument } from './report';
import { ReportingStore } from './store';

describe('ReportingStore', () => {
  const mockLogger = createMockLevelLogger();
  let mockCore: ReportingCore;
  let mockEsClient: DeeplyMockedKeys<ElasticsearchClient>;

  beforeEach(async () => {
    const reportingConfig = {
      index: '.reporting-test',
      queue: { indexInterval: 'week' },
    };
    mockCore = await createMockReportingCore(createMockConfigSchema(reportingConfig));
    mockEsClient = (await mockCore.getEsClient()).asInternalUser as typeof mockEsClient;

    mockEsClient.indices.create.mockResolvedValue({} as any);
    mockEsClient.indices.exists.mockResolvedValue({} as any);
    mockEsClient.indices.refresh.mockResolvedValue({} as any);
    mockEsClient.get.mockResolvedValue({} as any);
    mockEsClient.index.mockResolvedValue({ body: { _id: 'stub-id', _index: 'stub-index' } } as any);
    mockEsClient.update.mockResolvedValue({} as any);
  });

  describe('addReport', () => {
    it('returns Report object', async () => {
      const store = new ReportingStore(mockCore, mockLogger);
      const mockReport = new Report({
        _index: '.reporting-mock',
        attempts: 0,
        created_by: 'username1',
        jobtype: 'unknowntype',
        status: 'pending',
        payload: {},
        meta: {},
      } as any);
      await expect(store.addReport(mockReport)).resolves.toMatchObject({
        _primary_term: undefined,
        _seq_no: undefined,
        attempts: 0,
        completed_at: undefined,
        created_by: 'username1',
        jobtype: 'unknowntype',
        payload: {},
        meta: {},
        status: 'pending',
      });
    });

    it('throws if options has invalid indexInterval', async () => {
      const reportingConfig = {
        index: '.reporting-test',
        queue: { indexInterval: 'centurially' },
      };
      mockCore = await createMockReportingCore(createMockConfigSchema(reportingConfig));

      const store = new ReportingStore(mockCore, mockLogger);
      const mockReport = new Report({
        _index: '.reporting-errortest',
        jobtype: 'unknowntype',
        payload: {},
        meta: {},
      } as any);
      expect(store.addReport(mockReport)).rejects.toMatchInlineSnapshot(
        `[Error: Report object from ES has missing fields!]`
      );
    });

    it('handles error creating the index', async () => {
      // setup
      mockEsClient.indices.exists.mockResolvedValue({ body: false } as any);
      mockEsClient.indices.create.mockRejectedValue(new Error('horrible error'));

      const store = new ReportingStore(mockCore, mockLogger);
      const mockReport = new Report({
        _index: '.reporting-errortest',
        jobtype: 'unknowntype',
        payload: {},
        meta: {},
      } as any);
      await expect(store.addReport(mockReport)).rejects.toMatchInlineSnapshot(
        `[Error: horrible error]`
      );
    });

    /* Creating the index will fail, if there were multiple jobs staged in
     * parallel and creation completed from another Kibana instance.  Only the
     * first request in line can successfully create it.
     * In spite of that race condition, adding the new job in Elasticsearch is
     * fine.
     */
    it('ignores index creation error if the index already exists and continues adding the report', async () => {
      // setup
      mockEsClient.indices.exists.mockResolvedValue({ body: false } as any);
      mockEsClient.indices.create.mockRejectedValue(new Error('devastating error'));

      const store = new ReportingStore(mockCore, mockLogger);
      const mockReport = new Report({
        _index: '.reporting-mock',
        jobtype: 'unknowntype',
        payload: {},
        meta: {},
      } as any);
      await expect(store.addReport(mockReport)).rejects.toMatchInlineSnapshot(
        `[Error: devastating error]`
      );
    });

    it('skips creating the index if already exists', async () => {
      // setup
      mockEsClient.indices.exists.mockResolvedValue({ body: false } as any);
      // will be triggered but ignored
      mockEsClient.indices.create.mockRejectedValue(new Error('resource_already_exists_exception'));

      const store = new ReportingStore(mockCore, mockLogger);
      const mockReport = new Report({
        created_by: 'user1',
        jobtype: 'unknowntype',
        payload: {},
        meta: {},
      } as any);
      await expect(store.addReport(mockReport)).resolves.toMatchObject({
        _primary_term: undefined,
        _seq_no: undefined,
        attempts: 0,
        created_by: 'user1',
        jobtype: 'unknowntype',
        payload: {},
        status: 'pending',
      });
    });

    it('allows username string to be `false`', async () => {
      // setup
      mockEsClient.indices.exists.mockResolvedValue({ body: false } as any);
      // will be triggered but ignored
      mockEsClient.indices.create.mockRejectedValue(new Error('resource_already_exists_exception'));

      const store = new ReportingStore(mockCore, mockLogger);
      const mockReport = new Report({
        _index: '.reporting-unsecured',
        attempts: 0,
        created_by: false,
        jobtype: 'unknowntype',
        payload: {},
        meta: {},
        status: 'pending',
      } as any);
      await expect(store.addReport(mockReport)).resolves.toMatchObject({
        _primary_term: undefined,
        _seq_no: undefined,
        attempts: 0,
        created_by: false,
        jobtype: 'unknowntype',
        meta: {},
        payload: {},
        status: 'pending',
      });
    });
  });

  it('findReport gets a report from ES and returns a Report object', async () => {
    // setup
    const mockReport: ReportDocument = {
      _id: '1234-foo-78',
      _index: '.reporting-test-17409',
      _primary_term: 1234,
      _seq_no: 5678,
      _source: {
        kibana_name: 'test',
        kibana_id: 'test123',
        migration_version: 'X.0.0',
        created_at: 'some time',
        created_by: 'some security person',
        jobtype: 'csv',
        status: 'pending',
        meta: { testMeta: 'meta' } as any,
        payload: { testPayload: 'payload' } as any,
        browser_type: 'browser type string',
        attempts: 0,
        max_attempts: 1,
        timeout: 30000,
        output: null,
      },
    };
    mockEsClient.get.mockResolvedValue({ body: mockReport } as any);
    const store = new ReportingStore(mockCore, mockLogger);
    const report = new Report({
      ...mockReport,
      ...mockReport._source,
    });

    expect(await store.findReportFromTask(report.toReportTaskJSON())).toMatchInlineSnapshot(`
      Report {
        "_id": "1234-foo-78",
        "_index": ".reporting-test-17409",
        "_primary_term": 1234,
        "_seq_no": 5678,
        "attempts": 0,
        "browser_type": "browser type string",
        "completed_at": undefined,
        "created_at": "some time",
        "created_by": "some security person",
        "jobtype": "csv",
        "kibana_id": undefined,
        "kibana_name": undefined,
        "max_attempts": 1,
        "meta": Object {
          "testMeta": "meta",
        },
        "migration_version": "7.14.0",
        "output": null,
        "payload": Object {
          "testPayload": "payload",
        },
        "process_expiration": undefined,
        "started_at": undefined,
        "status": "pending",
        "timeout": 30000,
      }
    `);
  });

  it('setReportClaimed sets the status of a record to processing', async () => {
    const store = new ReportingStore(mockCore, mockLogger);
    const report = new Report({
      _id: 'id-of-processing',
      _index: '.reporting-test-index-12345',
      _seq_no: 42,
      _primary_term: 10002,
      jobtype: 'test-report',
      created_by: 'created_by_test_string',
      browser_type: 'browser_type_test_string',
      max_attempts: 50,
      payload: {
        title: 'test report',
        headers: 'rp_test_headers',
        objectType: 'testOt',
        browserTimezone: 'ABC',
      },
      timeout: 30000,
    });

    await store.setReportClaimed(report, { testDoc: 'test' } as any);

    const [updateCall] = mockEsClient.update.mock.calls;
    expect(updateCall).toMatchInlineSnapshot(`
      Array [
        Object {
          "body": Object {
            "doc": Object {
              "migration_version": "7.14.0",
              "status": "processing",
              "testDoc": "test",
            },
          },
          "id": "id-of-processing",
          "if_primary_term": 10002,
          "if_seq_no": 42,
          "index": ".reporting-test-index-12345",
          "refresh": true,
        },
      ]
    `);
  });

  it('setReportFailed sets the status of a record to failed', async () => {
    const store = new ReportingStore(mockCore, mockLogger);
    const report = new Report({
      _id: 'id-of-failure',
      _index: '.reporting-test-index-12345',
      _seq_no: 42,
      _primary_term: 10002,
      jobtype: 'test-report',
      created_by: 'created_by_test_string',
      browser_type: 'browser_type_test_string',
      max_attempts: 50,
      payload: {
        title: 'test report',
        headers: 'rp_test_headers',
        objectType: 'testOt',
        browserTimezone: 'BCD',
      },
      timeout: 30000,
    });

    await store.setReportFailed(report, { errors: 'yes' } as any);

    const [updateCall] = mockEsClient.update.mock.calls;
    expect(updateCall).toMatchInlineSnapshot(`
      Array [
        Object {
          "body": Object {
            "doc": Object {
              "errors": "yes",
              "migration_version": "7.14.0",
              "status": "failed",
            },
          },
          "id": "id-of-failure",
          "if_primary_term": 10002,
          "if_seq_no": 42,
          "index": ".reporting-test-index-12345",
          "refresh": true,
        },
      ]
    `);
  });

  it('setReportCompleted sets the status of a record to completed', async () => {
    const store = new ReportingStore(mockCore, mockLogger);
    const report = new Report({
      _id: 'vastly-great-report-id',
      _index: '.reporting-test-index-12345',
      _seq_no: 42,
      _primary_term: 10002,
      jobtype: 'test-report',
      created_by: 'created_by_test_string',
      browser_type: 'browser_type_test_string',
      max_attempts: 50,
      payload: {
        title: 'test report',
        headers: 'rp_test_headers',
        objectType: 'testOt',
        browserTimezone: 'CDE',
      },
      timeout: 30000,
    });

    await store.setReportCompleted(report, { certainly_completed: 'yes' } as any);

    const [updateCall] = mockEsClient.update.mock.calls;
    expect(updateCall).toMatchInlineSnapshot(`
      Array [
        Object {
          "body": Object {
            "doc": Object {
              "certainly_completed": "yes",
              "migration_version": "7.14.0",
              "status": "completed",
            },
          },
          "id": "vastly-great-report-id",
          "if_primary_term": 10002,
          "if_seq_no": 42,
          "index": ".reporting-test-index-12345",
          "refresh": true,
        },
      ]
    `);
  });

  it('setReportCompleted sets the status of a record to completed_with_warnings', async () => {
    const store = new ReportingStore(mockCore, mockLogger);
    const report = new Report({
      _id: 'vastly-great-report-id',
      _index: '.reporting-test-index-12345',
      _seq_no: 42,
      _primary_term: 10002,
      jobtype: 'test-report',
      created_by: 'created_by_test_string',
      browser_type: 'browser_type_test_string',
      max_attempts: 50,
      payload: {
        title: 'test report',
        headers: 'rp_test_headers',
        objectType: 'testOt',
        browserTimezone: 'utc',
      },
      timeout: 30000,
    });

    await store.setReportCompleted(report, {
      certainly_completed: 'pretty_much',
      output: {
        warnings: [`those pants don't go with that shirt`],
      },
    } as any);

    const [updateCall] = mockEsClient.update.mock.calls;
    expect(updateCall).toMatchInlineSnapshot(`
      Array [
        Object {
          "body": Object {
            "doc": Object {
              "certainly_completed": "pretty_much",
              "migration_version": "7.14.0",
              "output": Object {
                "warnings": Array [
                  "those pants don't go with that shirt",
                ],
              },
              "status": "completed_with_warnings",
            },
          },
          "id": "vastly-great-report-id",
          "if_primary_term": 10002,
          "if_seq_no": 42,
          "index": ".reporting-test-index-12345",
          "refresh": true,
        },
      ]
    `);
  });

  it('prepareReportForRetry resets the expiration and status on the report document', async () => {
    const store = new ReportingStore(mockCore, mockLogger);
    const report = new Report({
      _id: 'pretty-good-report-id',
      _index: '.reporting-test-index-94058763',
      _seq_no: 42,
      _primary_term: 10002,
      jobtype: 'test-report-2',
      created_by: 'created_by_test_string',
      browser_type: 'browser_type_test_string',
      status: 'processing',
      process_expiration: '2002',
      max_attempts: 3,
      payload: {
        title: 'test report',
        headers: 'rp_test_headers',
        objectType: 'testOt',
        browserTimezone: 'utc',
      },
      timeout: 30000,
    });

    await store.prepareReportForRetry(report);

    const [updateCall] = mockEsClient.update.mock.calls;
    expect(updateCall).toMatchInlineSnapshot(`
      Array [
        Object {
          "body": Object {
            "doc": Object {
              "migration_version": "7.14.0",
              "process_expiration": null,
              "status": "pending",
            },
          },
          "id": "pretty-good-report-id",
          "if_primary_term": 10002,
          "if_seq_no": 42,
          "index": ".reporting-test-index-94058763",
          "refresh": true,
        },
      ]
    `);
  });
});
