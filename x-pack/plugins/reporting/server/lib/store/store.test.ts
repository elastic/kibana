/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { elasticsearchServiceMock, loggingSystemMock } from 'src/core/server/mocks';
import { ReportingCore } from '../../';
import { createMockConfigSchema, createMockReportingCore } from '../../test_helpers';
import { Report, ReportDocument, ReportingStore, SavedReport } from './';

describe('ReportingStore', () => {
  const mockLogger = loggingSystemMock.createLogger();
  let mockCore: ReportingCore;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(async () => {
    const reportingConfig = {
      index: '.reporting-test',
      queue: { indexInterval: 'week' },
    };
    mockCore = await createMockReportingCore(createMockConfigSchema(reportingConfig));
    mockEsClient = (await mockCore.getEsClient()).asInternalUser as typeof mockEsClient;

    mockEsClient.indices.create.mockResponse({} as any);
    mockEsClient.indices.exists.mockResponse({} as any);
    mockEsClient.indices.refresh.mockResponse({} as any);
    mockEsClient.get.mockResponse({} as any);
    mockEsClient.index.mockResponse({ _id: 'stub-id', _index: 'stub-index' } as any);
    mockEsClient.update.mockResponse({} as any);
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
      mockEsClient.indices.exists.mockResponse(false);
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
      mockEsClient.indices.exists.mockResponse(false);
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
      mockEsClient.indices.exists.mockResponse(false);
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
      mockEsClient.indices.exists.mockResponse(false);
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

  it('findReport gets a report from ES and returns a SavedReport object', async () => {
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
        jobtype: 'csv_searchsource',
        status: 'pending',
        meta: { testMeta: 'meta' } as any,
        payload: { testPayload: 'payload' } as any,
        attempts: 0,
        max_attempts: 1,
        timeout: 30000,
        output: null,
        metrics: {
          png: {
            cpu: 0.02,
            cpuInPercentage: 2,
            memory: 1024 * 1024,
            memoryInMegabytes: 1,
          },
        },
      },
    };
    mockEsClient.get.mockResponse(mockReport as any);
    const store = new ReportingStore(mockCore, mockLogger);
    const report = new Report({
      ...mockReport,
      ...mockReport._source,
    });

    expect(await store.findReportFromTask(report.toReportTaskJSON())).toMatchInlineSnapshot(`
      SavedReport {
        "_id": "1234-foo-78",
        "_index": ".reporting-test-17409",
        "_primary_term": 1234,
        "_seq_no": 5678,
        "attempts": 0,
        "completed_at": undefined,
        "created_at": "some time",
        "created_by": "some security person",
        "jobtype": "csv_searchsource",
        "kibana_id": undefined,
        "kibana_name": undefined,
        "max_attempts": 1,
        "meta": Object {
          "testMeta": "meta",
        },
        "metrics": Object {
          "png": Object {
            "cpu": 0.02,
            "cpuInPercentage": 2,
            "memory": 1048576,
            "memoryInMegabytes": 1,
          },
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

  it('setReportClaimed sets the status of a saved report to processing', async () => {
    const store = new ReportingStore(mockCore, mockLogger);
    const report = new SavedReport({
      _id: 'id-of-processing',
      _index: '.reporting-test-index-12345',
      _seq_no: 42,
      _primary_term: 10002,
      jobtype: 'test-report',
      created_by: 'created_by_test_string',
      max_attempts: 50,
      payload: {
        title: 'test report',
        headers: 'rp_test_headers',
        objectType: 'testOt',
        browserTimezone: 'ABC',
        version: '7.14.0',
      },
      timeout: 30000,
    });

    await store.setReportClaimed(report, { testDoc: 'test' } as any);

    const [[updateCall]] = mockEsClient.update.mock.calls;

    const response = (updateCall as estypes.UpdateRequest).body?.doc as Report;
    expect(response.migration_version).toBe(`7.14.0`);
    expect(response.status).toBe(`processing`);
    expect(updateCall.if_seq_no).toBe(42);
    expect(updateCall.if_primary_term).toBe(10002);
  });

  it('setReportFailed sets the status of a saved report to failed', async () => {
    const store = new ReportingStore(mockCore, mockLogger);
    const report = new SavedReport({
      _id: 'id-of-failure',
      _index: '.reporting-test-index-12345',
      _seq_no: 43,
      _primary_term: 10002,
      jobtype: 'test-report',
      created_by: 'created_by_test_string',
      max_attempts: 50,
      payload: {
        title: 'test report',
        headers: 'rp_test_headers',
        objectType: 'testOt',
        browserTimezone: 'BCD',
        version: '7.14.0',
      },
      timeout: 30000,
    });

    await store.setReportFailed(report, { errors: 'yes' } as any);

    const [[updateCall]] = mockEsClient.update.mock.calls;
    const response = (updateCall as estypes.UpdateRequest).body?.doc as Report;
    expect(response.migration_version).toBe(`7.14.0`);
    expect(response.status).toBe(`failed`);
    expect(updateCall.if_seq_no).toBe(43);
    expect(updateCall.if_primary_term).toBe(10002);
  });

  it('setReportCompleted sets the status of a saved report to completed', async () => {
    const store = new ReportingStore(mockCore, mockLogger);
    const report = new SavedReport({
      _id: 'vastly-great-report-id',
      _index: '.reporting-test-index-12345',
      _seq_no: 44,
      _primary_term: 10002,
      jobtype: 'test-report',
      created_by: 'created_by_test_string',
      max_attempts: 50,
      payload: {
        title: 'test report',
        headers: 'rp_test_headers',
        objectType: 'testOt',
        browserTimezone: 'CDE',
        version: '7.14.0',
      },
      timeout: 30000,
    });

    await store.setReportCompleted(report, { certainly_completed: 'yes' } as any);

    const [[updateCall]] = mockEsClient.update.mock.calls;
    const response = (updateCall as estypes.UpdateRequest).body?.doc as Report;
    expect(response.migration_version).toBe(`7.14.0`);
    expect(response.status).toBe(`completed`);
    expect(updateCall.if_seq_no).toBe(44);
    expect(updateCall.if_primary_term).toBe(10002);
  });

  it('sets the status of a saved report to completed_with_warnings', async () => {
    const store = new ReportingStore(mockCore, mockLogger);
    const report = new SavedReport({
      _id: 'vastly-great-report-id',
      _index: '.reporting-test-index-12345',
      _seq_no: 45,
      _primary_term: 10002,
      jobtype: 'test-report',
      created_by: 'created_by_test_string',
      max_attempts: 50,
      payload: {
        title: 'test report',
        headers: 'rp_test_headers',
        objectType: 'testOt',
        browserTimezone: 'utc',
        version: '7.14.0',
      },
      timeout: 30000,
    });

    await store.setReportCompleted(report, {
      certainly_completed: 'pretty_much',
      output: {
        warnings: [`those pants don't go with that shirt`],
      },
    } as any);

    const [[updateCall]] = mockEsClient.update.mock.calls;
    const response = (updateCall as estypes.UpdateRequest).body?.doc as Report;

    expect(response.migration_version).toBe(`7.14.0`);
    expect(response.status).toBe(`completed_with_warnings`);
    expect(updateCall.if_seq_no).toBe(45);
    expect(updateCall.if_primary_term).toBe(10002);
    expect(response.output).toMatchInlineSnapshot(`
      Object {
        "warnings": Array [
          "those pants don't go with that shirt",
        ],
      }
    `);
  });

  it('prepareReportForRetry resets the expiration and status on the report document', async () => {
    const store = new ReportingStore(mockCore, mockLogger);
    const report = new SavedReport({
      _id: 'pretty-good-report-id',
      _index: '.reporting-test-index-94058763',
      _seq_no: 46,
      _primary_term: 10002,
      jobtype: 'test-report-2',
      created_by: 'created_by_test_string',
      status: 'processing',
      process_expiration: '2002',
      max_attempts: 3,
      payload: {
        title: 'test report',
        headers: 'rp_test_headers',
        objectType: 'testOt',
        browserTimezone: 'utc',
        version: '7.14.0',
      },
      timeout: 30000,
    });

    await store.prepareReportForRetry(report);

    const [[updateCall]] = mockEsClient.update.mock.calls;
    const response = (updateCall as estypes.UpdateRequest).body?.doc as Report;

    expect(response.migration_version).toBe(`7.14.0`);
    expect(response.status).toBe(`pending`);
    expect(updateCall.if_seq_no).toBe(46);
    expect(updateCall.if_primary_term).toBe(10002);
  });

  describe('start', () => {
    it('creates an ILM policy for managing reporting indices if there is not already one', async () => {
      mockEsClient.ilm.getLifecycle.mockRejectedValue({ statusCode: 404 });
      mockEsClient.ilm.putLifecycle.mockResponse({} as any);

      const store = new ReportingStore(mockCore, mockLogger);
      await store.start();

      expect(mockEsClient.ilm.getLifecycle).toHaveBeenCalledWith({ name: 'kibana-reporting' });
      expect(mockEsClient.ilm.putLifecycle.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "body": Object {
            "policy": Object {
              "phases": Object {
                "hot": Object {
                  "actions": Object {},
                },
              },
            },
          },
          "name": "kibana-reporting",
        }
      `);
    });

    it('does not create an ILM policy for managing reporting indices if one already exists', async () => {
      mockEsClient.ilm.getLifecycle.mockResponse({});

      const store = new ReportingStore(mockCore, mockLogger);
      await store.start();

      expect(mockEsClient.ilm.getLifecycle).toHaveBeenCalledWith({ name: 'kibana-reporting' });
      expect(mockEsClient.ilm.putLifecycle).not.toHaveBeenCalled();
    });
  });
});
