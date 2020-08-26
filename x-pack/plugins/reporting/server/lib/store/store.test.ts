/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { ElasticsearchServiceSetup } from 'src/core/server';
import { ReportingConfig, ReportingCore } from '../..';
import { createMockReportingCore } from '../../test_helpers';
import { createMockLevelLogger } from '../../test_helpers/create_mock_levellogger';
import { Report } from './report';
import { ReportingStore } from './store';

const getMockConfig = (mockConfigGet: sinon.SinonStub) => ({
  get: mockConfigGet,
  kbnConfig: { get: mockConfigGet },
});

describe('ReportingStore', () => {
  const mockLogger = createMockLevelLogger();
  let mockConfig: ReportingConfig;
  let mockCore: ReportingCore;

  const callClusterStub = sinon.stub();
  const mockElasticsearch = { legacy: { client: { callAsInternalUser: callClusterStub } } };

  beforeEach(async () => {
    const mockConfigGet = sinon.stub();
    mockConfigGet.withArgs('index').returns('.reporting-test');
    mockConfigGet.withArgs('queue', 'indexInterval').returns('week');
    mockConfig = getMockConfig(mockConfigGet);
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
      const reportType = 'unknowntype';
      const reportPayload = {
        browserTimezone: 'UTC',
        headers: 'rp_headers_1',
        objectType: 'testOt',
      };
      await expect(
        store.addReport(reportType, { username: 'username1' }, reportPayload)
      ).resolves.toMatchObject({
        _primary_term: undefined,
        _seq_no: undefined,
        attempts: 0,
        browser_type: undefined,
        completed_at: undefined,
        created_by: 'username1',
        jobtype: 'unknowntype',
        max_attempts: undefined,
        payload: {},
        priority: 10,
        started_at: undefined,
        status: 'pending',
        timeout: undefined,
      });
    });

    it('throws if options has invalid indexInterval', async () => {
      const mockConfigGet = sinon.stub();
      mockConfigGet.withArgs('index').returns('.reporting-test');
      mockConfigGet.withArgs('queue', 'indexInterval').returns('centurially');
      mockConfig = getMockConfig(mockConfigGet);
      mockCore = await createMockReportingCore(mockConfig);

      const store = new ReportingStore(mockCore, mockLogger);
      const reportType = 'unknowntype';
      const reportPayload = {
        browserTimezone: 'UTC',
        headers: 'rp_headers_2',
        objectType: 'testOt',
      };
      expect(
        store.addReport(reportType, { username: 'user1' }, reportPayload)
      ).rejects.toMatchInlineSnapshot(`[Error: Invalid index interval: centurially]`);
    });

    it('handles error creating the index', async () => {
      // setup
      callClusterStub.withArgs('indices.exists').resolves(false);
      callClusterStub.withArgs('indices.create').rejects(new Error('horrible error'));

      const store = new ReportingStore(mockCore, mockLogger);
      const reportType = 'unknowntype';
      const reportPayload = {
        browserTimezone: 'UTC',
        headers: 'rp_headers_3',
        objectType: 'testOt',
      };
      await expect(
        store.addReport(reportType, { username: 'user1' }, reportPayload)
      ).rejects.toMatchInlineSnapshot(`[Error: horrible error]`);
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
      const reportType = 'unknowntype';
      const reportPayload = {
        browserTimezone: 'UTC',
        headers: 'rp_headers_4',
        objectType: 'testOt',
      };
      await expect(
        store.addReport(reportType, { username: 'user1' }, reportPayload)
      ).rejects.toMatchInlineSnapshot(`[Error: devastating error]`);
    });

    it('skips creating the index if already exists', async () => {
      // setup
      callClusterStub.withArgs('indices.exists').resolves(false);
      callClusterStub
        .withArgs('indices.create')
        .rejects(new Error('resource_already_exists_exception')); // will be triggered but ignored

      const store = new ReportingStore(mockCore, mockLogger);
      const reportType = 'unknowntype';
      const reportPayload = {
        browserTimezone: 'UTC',
        headers: 'rp_headers_5',
        objectType: 'testOt',
      };
      await expect(
        store.addReport(reportType, { username: 'user1' }, reportPayload)
      ).resolves.toMatchObject({
        _primary_term: undefined,
        _seq_no: undefined,
        attempts: 0,
        browser_type: undefined,
        completed_at: undefined,
        created_by: 'user1',
        jobtype: 'unknowntype',
        max_attempts: undefined,
        payload: {},
        priority: 10,
        started_at: undefined,
        status: 'pending',
        timeout: undefined,
      });
    });

    it('allows username string to be `false`', async () => {
      // setup
      callClusterStub.withArgs('indices.exists').resolves(false);
      callClusterStub
        .withArgs('indices.create')
        .rejects(new Error('resource_already_exists_exception')); // will be triggered but ignored

      const store = new ReportingStore(mockCore, mockLogger);
      const reportType = 'unknowntype';
      const reportPayload = {
        browserTimezone: 'UTC',
        headers: 'rp_test_headers',
        objectType: 'testOt',
      };
      await expect(store.addReport(reportType, false, reportPayload)).resolves.toMatchObject({
        _primary_term: undefined,
        _seq_no: undefined,
        attempts: 0,
        browser_type: undefined,
        completed_at: undefined,
        created_by: false,
        jobtype: 'unknowntype',
        max_attempts: undefined,
        payload: {},
        priority: 10,
        started_at: undefined,
        status: 'pending',
        timeout: undefined,
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
        headers: 'rp_test_headers',
        objectType: 'testOt',
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
        headers: 'rp_test_headers',
        objectType: 'testOt',
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
        headers: 'rp_test_headers',
        objectType: 'testOt',
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
        headers: 'rp_test_headers',
        objectType: 'testOt',
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
