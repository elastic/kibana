/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { ReportingConfig, ReportingCore } from '../..';
import { createMockReportingCore } from '../../test_helpers';
import { createMockLevelLogger } from '../../test_helpers/create_mock_levellogger';
import { ReportingStore } from './store';
import { ElasticsearchServiceSetup } from 'src/core/server';

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

    callClusterStub.withArgs('indices.exists').resolves({});
    callClusterStub.withArgs('indices.create').resolves({});
    callClusterStub.withArgs('index').resolves({});
    callClusterStub.withArgs('indices.refresh').resolves({});
    callClusterStub.withArgs('update').resolves({});

    mockCore.getElasticsearchService = () =>
      (mockElasticsearch as unknown) as ElasticsearchServiceSetup;
  });

  describe('addReport', () => {
    it('returns Report object', async () => {
      const store = new ReportingStore(mockCore, mockLogger);
      const reportType = 'unknowntype';
      const reportPayload = {};
      const reportOptions = {
        timeout: 10000,
        created_by: 'created_by_string',
        browser_type: 'browser_type_string',
        max_attempts: 1,
      };
      await expect(
        store.addReport(reportType, reportPayload, reportOptions)
      ).resolves.toMatchObject({
        _primary_term: undefined,
        _seq_no: undefined,
        browser_type: 'browser_type_string',
        created_by: 'created_by_string',
        jobtype: 'unknowntype',
        max_attempts: 1,
        payload: {},
        priority: 10,
        timeout: 10000,
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
      const reportPayload = {};
      const reportOptions = {
        timeout: 10000,
        created_by: 'created_by_string',
        browser_type: 'browser_type_string',
        max_attempts: 1,
      };
      expect(
        store.addReport(reportType, reportPayload, reportOptions)
      ).rejects.toMatchInlineSnapshot(`[Error: Invalid index interval: centurially]`);
    });

    it('handles error creating the index', async () => {
      // setup
      callClusterStub.withArgs('indices.exists').resolves(false);
      callClusterStub.withArgs('indices.create').rejects(new Error('error'));

      const store = new ReportingStore(mockCore, mockLogger);
      const reportType = 'unknowntype';
      const reportPayload = {};
      const reportOptions = {
        timeout: 10000,
        created_by: 'created_by_string',
        browser_type: 'browser_type_string',
        max_attempts: 1,
      };
      await expect(
        store.addReport(reportType, reportPayload, reportOptions)
      ).rejects.toMatchInlineSnapshot(`[Error: error]`);
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
      callClusterStub.withArgs('indices.create').rejects(new Error('error'));

      const store = new ReportingStore(mockCore, mockLogger);
      const reportType = 'unknowntype';
      const reportPayload = {};
      const reportOptions = {
        timeout: 10000,
        created_by: 'created_by_string',
        browser_type: 'browser_type_string',
        max_attempts: 1,
      };
      await expect(
        store.addReport(reportType, reportPayload, reportOptions)
      ).rejects.toMatchInlineSnapshot(`[Error: error]`);
    });

    it('skips creating the index if already exists', async () => {
      // setup
      callClusterStub.withArgs('indices.exists').resolves(false);
      callClusterStub
        .withArgs('indices.create')
        .rejects(new Error('resource_already_exists_exception')); // will be triggered but ignored

      const store = new ReportingStore(mockCore, mockLogger);
      const reportType = 'unknowntype';
      const reportPayload = {};
      const reportOptions = {
        timeout: 10000,
        created_by: 'created_by_string',
        browser_type: 'browser_type_string',
        max_attempts: 1,
      };
      await expect(
        store.addReport(reportType, reportPayload, reportOptions)
      ).resolves.toMatchObject({
        _primary_term: undefined,
        _seq_no: undefined,
        browser_type: 'browser_type_string',
        created_by: 'created_by_string',
        jobtype: 'unknowntype',
        max_attempts: 1,
        payload: {},
        priority: 10,
        timeout: 10000,
      });
    });
  });
});
