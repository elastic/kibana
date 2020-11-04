/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { ElasticsearchServiceSetup } from 'src/core/server';
import { ReportingConfig, ReportingCore } from '../..';
import {
  createMockConfig,
  createMockConfigSchema,
  createMockLevelLogger,
  createMockReportingCore,
} from '../../test_helpers';
import { Report } from './report';
import { ReportingStore } from './store';

describe('ReportingStore', () => {
  const mockLogger = createMockLevelLogger();
  let mockConfig: ReportingConfig;
  let mockCore: ReportingCore;

  const callClusterStub = sinon.stub();
  const mockElasticsearch = { legacy: { client: { callAsInternalUser: callClusterStub } } };

  beforeEach(async () => {
    const reportingConfig = {
      index: '.reporting-test',
      queue: { indexInterval: 'week' },
    };
    const mockSchema = createMockConfigSchema(reportingConfig);
    mockConfig = createMockConfig(mockSchema);
    mockCore = await createMockReportingCore(mockConfig);

    callClusterStub.reset();
    callClusterStub.withArgs('indices.exists').resolves({});
    callClusterStub.withArgs('indices.create').resolves({});
    callClusterStub.withArgs('index').resolves({ _id: 'stub-id', _index: 'stub-index' });
    callClusterStub.withArgs('indices.refresh').resolves({});
    callClusterStub.withArgs('update').resolves({});
    callClusterStub.withArgs('get').resolves({});

    mockCore.getElasticsearchService = () =>
      (mockElasticsearch as unknown) as ElasticsearchServiceSetup;
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
      const mockSchema = createMockConfigSchema(reportingConfig);
      mockConfig = createMockConfig(mockSchema);
      mockCore = await createMockReportingCore(mockConfig);

      const store = new ReportingStore(mockCore, mockLogger);
      const mockReport = new Report({
        _index: '.reporting-errortest',
        jobtype: 'unknowntype',
        payload: {},
        meta: {},
      } as any);
      expect(store.addReport(mockReport)).rejects.toMatchInlineSnapshot(
        `[TypeError: this.client.callAsInternalUser is not a function]`
      );
    });

    it('handles error creating the index', async () => {
      // setup
      callClusterStub.withArgs('indices.exists').resolves(false);
      callClusterStub.withArgs('indices.create').rejects(new Error('horrible error'));

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
      callClusterStub.withArgs('indices.exists').resolves(false);
      callClusterStub.withArgs('indices.create').rejects(new Error('devastating error'));

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
      callClusterStub.withArgs('indices.exists').resolves(false);
      callClusterStub
        .withArgs('indices.create')
        .rejects(new Error('resource_already_exists_exception')); // will be triggered but ignored

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
      callClusterStub.withArgs('indices.exists').resolves(false);
      callClusterStub
        .withArgs('indices.create')
        .rejects(new Error('resource_already_exists_exception')); // will be triggered but ignored

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
      priority: 1,
    });

    await store.setReportClaimed(report, { testDoc: 'test' } as any);

    const updateCall = callClusterStub.getCalls().find((call) => call.args[0] === 'update');
    expect(updateCall && updateCall.args).toMatchInlineSnapshot(`
      Array [
        "update",
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
      priority: 1,
    });

    await store.setReportFailed(report, { errors: 'yes' } as any);

    const updateCall = callClusterStub.getCalls().find((call) => call.args[0] === 'update');
    expect(updateCall && updateCall.args).toMatchInlineSnapshot(`
      Array [
        "update",
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
      priority: 1,
    });

    await store.setReportCompleted(report, { certainly_completed: 'yes' } as any);

    const updateCall = callClusterStub.getCalls().find((call) => call.args[0] === 'update');
    expect(updateCall && updateCall.args).toMatchInlineSnapshot(`
      Array [
        "update",
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
      priority: 1,
    });

    await store.setReportCompleted(report, {
      certainly_completed: 'pretty_much',
      output: {
        warnings: [`those pants don't go with that shirt`],
      },
    } as any);

    const updateCall = callClusterStub.getCalls().find((call) => call.args[0] === 'update');
    expect(updateCall && updateCall.args).toMatchInlineSnapshot(`
      Array [
        "update",
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
});
