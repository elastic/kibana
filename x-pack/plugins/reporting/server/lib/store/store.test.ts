/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import { ElasticsearchClient } from 'src/core/server';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { ReportingCore } from '../../';
import {
  createMockConfigSchema,
  createMockLevelLogger,
  createMockReportingCore,
} from '../../test_helpers';
import { Report } from './report';
import { ReportingStore } from './store';

const { createApiResponse } = elasticsearchServiceMock;

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

  it('setReportClaimed sets the status of a record to processing', async () => {
    const store = new ReportingStore(mockCore, mockLogger);
    const report = new Report({
      _id: 'id-of-processing',
      _index: '.reporting-test-index-12345',
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
              "status": "processing",
              "testDoc": "test",
            },
          },
          "id": "id-of-processing",
          "if_primary_term": undefined,
          "if_seq_no": undefined,
          "index": ".reporting-test-index-12345",
        },
      ]
    `);
  });

  it('setReportFailed sets the status of a record to failed', async () => {
    const store = new ReportingStore(mockCore, mockLogger);
    const report = new Report({
      _id: 'id-of-failure',
      _index: '.reporting-test-index-12345',
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
              "status": "failed",
            },
          },
          "id": "id-of-failure",
          "if_primary_term": undefined,
          "if_seq_no": undefined,
          "index": ".reporting-test-index-12345",
        },
      ]
    `);
  });

  it('setReportCompleted sets the status of a record to completed', async () => {
    const store = new ReportingStore(mockCore, mockLogger);
    const report = new Report({
      _id: 'vastly-great-report-id',
      _index: '.reporting-test-index-12345',
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
              "status": "completed",
            },
          },
          "id": "vastly-great-report-id",
          "if_primary_term": undefined,
          "if_seq_no": undefined,
          "index": ".reporting-test-index-12345",
        },
      ]
    `);
  });

  it('setReportCompleted sets the status of a record to completed_with_warnings', async () => {
    const store = new ReportingStore(mockCore, mockLogger);
    const report = new Report({
      _id: 'vastly-great-report-id',
      _index: '.reporting-test-index-12345',
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
              "output": Object {
                "warnings": Array [
                  "those pants don't go with that shirt",
                ],
              },
              "status": "completed_with_warnings",
            },
          },
          "id": "vastly-great-report-id",
          "if_primary_term": undefined,
          "if_seq_no": undefined,
          "index": ".reporting-test-index-12345",
        },
      ]
    `);
  });

  describe('start', () => {
    it('creates an ILM policy for managing reporting indices if there is not already one', async () => {
      mockEsClient.ilm.getLifecycle.mockRejectedValueOnce(createApiResponse({ statusCode: 404 }));
      mockEsClient.ilm.putLifecycle.mockResolvedValueOnce(createApiResponse());

      const store = new ReportingStore(mockCore, mockLogger);
      await store.start();

      expect(mockEsClient.ilm.getLifecycle).toHaveBeenCalledWith({ policy: 'kibana-reporting' });
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
          "policy": "kibana-reporting",
        }
      `);
    });

    it('does not create an ILM policy for managing reporting indices if one already exists', async () => {
      mockEsClient.ilm.getLifecycle.mockResolvedValueOnce(createApiResponse());

      const store = new ReportingStore(mockCore, mockLogger);
      await store.start();

      expect(mockEsClient.ilm.getLifecycle).toHaveBeenCalledWith({ policy: 'kibana-reporting' });
      expect(mockEsClient.ilm.putLifecycle).not.toHaveBeenCalled();
    });
  });
});
