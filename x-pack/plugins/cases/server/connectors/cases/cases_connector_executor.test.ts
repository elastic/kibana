/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import moment from 'moment';
import { CasesConnectorExecutor } from './cases_connector_executor';
import {
  CASE_RULES_SAVED_OBJECT,
  MAX_ALERTS_PER_CASE,
  MAX_LENGTH_PER_TAG,
  MAX_TAGS_PER_CASE,
  MAX_TITLE_LENGTH,
} from '../../../common/constants';
import { CasesOracleService } from './cases_oracle_service';
import { CasesService } from './cases_service';
import { createCasesClientMock } from '../../client/mocks';
import { CaseStatuses } from '@kbn/cases-components';
import { CaseError } from '../../common/error';
import {
  alerts,
  cases,
  createdOracleRecord,
  groupedAlertsWithOracleKey,
  groupingBy,
  oracleRecords,
  rule,
  owner,
  timeWindow,
  reopenClosedCases,
  updatedCounterOracleRecord,
  alertsNested,
} from './index.mock';
import {
  expectCasesToHaveTheCorrectAlertsAttachedWithGrouping,
  expectCasesToHaveTheCorrectAlertsAttachedWithGroupingAndIncreasedCounter,
} from './test_helpers';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/core/server';
import type { CasesConnectorRunParams } from './types';
import { INITIAL_ORACLE_RECORD_COUNTER, MAX_OPEN_CASES } from './constants';
import { CustomFieldTypes } from '../../../common/types/domain';

jest.mock('./cases_oracle_service');
jest.mock('./cases_service');
jest.mock('@kbn/datemath');

const CasesOracleServiceMock = CasesOracleService as jest.Mock<CasesOracleService>;
const CasesServiceMock = CasesService as jest.Mock<CasesService>;
const dateMathMock = dateMath as jest.Mocked<typeof dateMath>;

describe('CasesConnectorExecutor', () => {
  const mockGetRecordId = jest.fn();
  const mockBulkGetRecords = jest.fn();
  const mockBulkCreateRecords = jest.fn();
  const mockBulkUpdateRecord = jest.fn();
  const mockGetCaseId = jest.fn();

  const getCasesClient = jest.fn();
  const casesClientMock = createCasesClientMock();
  const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

  let connectorExecutor: CasesConnectorExecutor;
  let oracleIdCounter = 0;
  let caseIdCounter = 0;

  const resetCounters = () => {
    oracleIdCounter = 0;
    caseIdCounter = 0;
  };

  const params: CasesConnectorRunParams = {
    alerts,
    groupingBy,
    owner,
    rule,
    timeWindow,
    reopenClosedCases,
    maximumCasesToOpen: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetCounters();

    // @ts-expect-error: other properties are not required
    CasesOracleServiceMock.mockImplementation(() => {
      return {
        getRecordId: mockGetRecordId.mockImplementation(
          () => `so-oracle-record-${oracleIdCounter++}`
        ),
        bulkGetRecords: mockBulkGetRecords.mockResolvedValue(oracleRecords),
        bulkCreateRecord: mockBulkCreateRecords.mockResolvedValue([createdOracleRecord]),
        bulkUpdateRecord: mockBulkUpdateRecord.mockResolvedValue([]),
      };
    });

    // @ts-expect-error: other properties are not required
    CasesServiceMock.mockImplementation(() => {
      return {
        getCaseId: mockGetCaseId.mockImplementation(() => `mock-id-${++caseIdCounter}`),
      };
    });

    casesClientMock.cases.bulkGet.mockResolvedValue({ cases, errors: [] });
    casesClientMock.cases.bulkCreate.mockResolvedValue({ cases: [] });
    casesClientMock.cases.bulkUpdate.mockResolvedValue([]);
    casesClientMock.attachments.bulkCreate.mockResolvedValue(cases[0]);
    casesClientMock.configure.get = jest.fn().mockResolvedValue([]);

    getCasesClient.mockReturnValue(casesClientMock);

    connectorExecutor = new CasesConnectorExecutor({
      logger: mockLogger,
      casesOracleService: new CasesOracleServiceMock(),
      casesService: new CasesServiceMock(),
      casesClient: casesClientMock,
      spaceId: 'default',
    });

    dateMathMock.parse.mockImplementation(() => moment('2023-10-09T10:23:42.769Z'));
  });

  describe('With grouping', () => {
    describe('run', () => {
      describe('Initial state', () => {
        beforeEach(() => {
          mockBulkGetRecords.mockResolvedValue([
            {
              id: groupedAlertsWithOracleKey[0].oracleKey,
              type: CASE_RULES_SAVED_OBJECT,
              message: 'Not found',
              statusCode: 404,
              error: 'Not found',
            },
            {
              id: groupedAlertsWithOracleKey[1].oracleKey,
              type: CASE_RULES_SAVED_OBJECT,
              message: 'Not found',
              statusCode: 404,
              error: 'Not found',
            },
            {
              id: groupedAlertsWithOracleKey[2].oracleKey,
              type: CASE_RULES_SAVED_OBJECT,
              message: 'Not found',
              statusCode: 404,
              error: 'Not found',
            },
          ]);

          mockBulkCreateRecords.mockResolvedValue([
            oracleRecords[0],
            oracleRecords[1],
            createdOracleRecord,
          ]);

          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [],
            errors: [
              {
                error: 'Not found',
                message: 'Not found',
                status: 404,
                caseId: 'mock-id-1',
              },
              {
                error: 'Not found',
                message: 'Not found',
                status: 404,
                caseId: 'mock-id-2',
              },
              {
                error: 'Not found',
                message: 'Not found',
                status: 404,
                caseId: 'mock-id-3',
              },
            ],
          });

          casesClientMock.cases.bulkCreate.mockResolvedValue({ cases });
        });

        it('attach the alerts correctly when the rule runs for the first time', async () => {
          await connectorExecutor.execute(params);

          expect(mockBulkGetRecords).toHaveBeenCalledTimes(1);
          expect(mockBulkGetRecords).toHaveBeenCalledWith([
            groupedAlertsWithOracleKey[0].oracleKey,
            groupedAlertsWithOracleKey[1].oracleKey,
            groupedAlertsWithOracleKey[2].oracleKey,
          ]);

          expect(mockBulkCreateRecords).toHaveBeenCalledTimes(1);
          expect(mockBulkCreateRecords).toHaveBeenCalledWith([
            {
              recordId: groupedAlertsWithOracleKey[0].oracleKey,
              payload: {
                grouping: groupedAlertsWithOracleKey[0].grouping,
                rules: [
                  {
                    id: 'rule-test-id',
                  },
                ],
              },
            },
            {
              recordId: groupedAlertsWithOracleKey[1].oracleKey,
              payload: {
                grouping: groupedAlertsWithOracleKey[1].grouping,
                rules: [
                  {
                    id: 'rule-test-id',
                  },
                ],
              },
            },
            {
              recordId: groupedAlertsWithOracleKey[2].oracleKey,
              payload: {
                grouping: groupedAlertsWithOracleKey[2].grouping,
                rules: [
                  {
                    id: 'rule-test-id',
                  },
                ],
              },
            },
          ]);

          expect(casesClientMock.cases.bulkGet).toHaveBeenCalledTimes(1);
          expect(casesClientMock.cases.bulkGet).toHaveBeenCalledWith({
            ids: ['mock-id-1', 'mock-id-2', 'mock-id-3'],
          });

          expect(casesClientMock.cases.bulkCreate).toHaveBeenCalledTimes(1);
          expect(casesClientMock.cases.bulkCreate).toHaveBeenCalledWith({
            cases: [
              {
                id: 'mock-id-1',
                title: 'Test rule (Auto-created)',
                description:
                  'This case is auto-created by [Test rule](https://example.com/rules/rule-test-id). \n\n Grouping: `host.name` equals `A` and `dest.ip` equals `0.0.0.1`',
                owner: 'cases',
                settings: {
                  syncAlerts: false,
                },
                tags: [
                  'auto-generated',
                  'rule:rule-test-id',
                  'host.name:A',
                  'dest.ip:0.0.0.1',
                  ...rule.tags,
                ],
                connector: {
                  fields: null,
                  id: 'none',
                  name: 'none',
                  type: '.none',
                },
                customFields: [],
              },
              {
                id: 'mock-id-2',
                title: 'Test rule (Auto-created)',
                description:
                  'This case is auto-created by [Test rule](https://example.com/rules/rule-test-id). \n\n Grouping: `host.name` equals `B` and `dest.ip` equals `0.0.0.1`',
                owner: 'cases',
                settings: {
                  syncAlerts: false,
                },
                tags: [
                  'auto-generated',
                  'rule:rule-test-id',
                  'host.name:B',
                  'dest.ip:0.0.0.1',
                  ...rule.tags,
                ],
                connector: {
                  fields: null,
                  id: 'none',
                  name: 'none',
                  type: '.none',
                },
                customFields: [],
              },
              {
                id: 'mock-id-3',
                title: 'Test rule (Auto-created)',
                description:
                  'This case is auto-created by [Test rule](https://example.com/rules/rule-test-id). \n\n Grouping: `host.name` equals `B` and `dest.ip` equals `0.0.0.3`',
                owner: 'cases',
                settings: {
                  syncAlerts: false,
                },
                tags: [
                  'auto-generated',
                  'rule:rule-test-id',
                  'host.name:B',
                  'dest.ip:0.0.0.3',
                  ...rule.tags,
                ],
                connector: {
                  fields: null,
                  id: 'none',
                  name: 'none',
                  type: '.none',
                },
                customFields: [],
              },
            ],
          });

          expectCasesToHaveTheCorrectAlertsAttachedWithGrouping(casesClientMock);
        });
      });

      describe('Oracle records', () => {
        it('generates the oracle keys correctly with grouping by one field', async () => {
          await connectorExecutor.execute({
            ...params,
            groupingBy: ['host.name'],
          });

          expect(mockGetRecordId).toHaveBeenCalledTimes(2);

          expect(mockGetRecordId).nthCalledWith(1, {
            ruleId: rule.id,
            grouping: { 'host.name': 'A' },
            owner,
            spaceId: 'default',
          });

          expect(mockGetRecordId).nthCalledWith(2, {
            ruleId: rule.id,
            grouping: { 'host.name': 'B' },
            owner,
            spaceId: 'default',
          });
        });

        it('generates the oracle keys correct with grouping by multiple fields', async () => {
          await connectorExecutor.execute(params);

          expect(mockGetRecordId).toHaveBeenCalledTimes(3);

          for (const [index, { grouping }] of groupedAlertsWithOracleKey.entries()) {
            expect(mockGetRecordId).nthCalledWith(index + 1, {
              ruleId: rule.id,
              grouping,
              owner,
              spaceId: 'default',
            });
          }
        });

        it('gets the oracle records correctly', async () => {
          await connectorExecutor.execute(params);

          expect(mockBulkGetRecords).toHaveBeenCalledWith([
            groupedAlertsWithOracleKey[0].oracleKey,
            groupedAlertsWithOracleKey[1].oracleKey,
            groupedAlertsWithOracleKey[2].oracleKey,
          ]);
        });

        it('created the non found oracle records correctly', async () => {
          await connectorExecutor.execute(params);

          expect(mockBulkCreateRecords).toHaveBeenCalledWith([
            {
              recordId: groupedAlertsWithOracleKey[2].oracleKey,
              payload: {
                grouping: groupedAlertsWithOracleKey[2].grouping,
                rules: [
                  {
                    id: 'rule-test-id',
                  },
                ],
              },
            },
          ]);
        });

        it('does not create oracle records if there are no 404 errors', async () => {
          mockBulkGetRecords.mockResolvedValue([oracleRecords[0]]);

          await connectorExecutor.execute(params);

          expect(mockBulkCreateRecords).not.toHaveBeenCalled();
        });

        it('run correctly with all records: valid, counter increased, counter did not increased, created', async () => {
          dateMathMock.parse.mockImplementation(() => moment('2023-10-11T10:23:42.769Z'));
          mockBulkCreateRecords.mockResolvedValue([createdOracleRecord]);

          mockBulkUpdateRecord.mockResolvedValue([{ ...oracleRecords[0], counter: 2 }]);

          await connectorExecutor.execute(params);

          // 1. Get all records
          expect(mockBulkGetRecords).toHaveBeenCalledWith([
            groupedAlertsWithOracleKey[0].oracleKey,
            groupedAlertsWithOracleKey[1].oracleKey,
            groupedAlertsWithOracleKey[2].oracleKey,
          ]);

          // 2. Create the non found records
          expect(mockBulkCreateRecords).toHaveBeenCalledWith([
            {
              recordId: groupedAlertsWithOracleKey[2].oracleKey,
              payload: {
                grouping: groupedAlertsWithOracleKey[2].grouping,
                rules: [
                  {
                    id: 'rule-test-id',
                  },
                ],
              },
            },
          ]);

          // 3. Update the counter for the records where the time window has passed
          expect(mockBulkUpdateRecord).toHaveBeenCalledWith([
            { payload: { counter: 2 }, recordId: 'so-oracle-record-0', version: 'so-version-0' },
          ]);
        });
      });

      describe('Time window', () => {
        it('does not increase the counter if the time window has not passed', async () => {
          mockBulkGetRecords.mockResolvedValue([oracleRecords[0]]);
          await connectorExecutor.execute(params);

          expect(mockBulkUpdateRecord).not.toHaveBeenCalled();
        });

        it('updates the counter correctly if the time window has passed', async () => {
          dateMathMock.parse.mockImplementation(() => moment('2023-11-10T10:23:42.769Z'));
          await connectorExecutor.execute(params);

          expect(mockBulkUpdateRecord).toHaveBeenCalledWith([
            { payload: { counter: 2 }, recordId: 'so-oracle-record-0', version: 'so-version-0' },
            { payload: { counter: 2 }, recordId: 'so-oracle-record-1', version: 'so-version-1' },
          ]);
        });
      });

      describe('Cases', () => {
        it('generates the case ids correctly', async () => {
          await connectorExecutor.execute(params);

          expect(mockGetCaseId).toHaveBeenCalledTimes(3);

          for (const [index, { grouping }] of groupedAlertsWithOracleKey.entries()) {
            expect(mockGetCaseId).nthCalledWith(index + 1, {
              ruleId: rule.id,
              grouping,
              owner,
              spaceId: 'default',
              counter: 1,
            });
          }
        });

        it('generates the case ids correctly when the time window has passed', async () => {
          dateMathMock.parse.mockImplementation(() => moment('2023-10-11T10:23:42.769Z'));

          mockBulkUpdateRecord.mockResolvedValue([{ ...oracleRecords[0], counter: 2 }]);

          await connectorExecutor.execute(params);

          expect(mockGetCaseId).toBeCalledTimes(3);

          /**
           * Oracle record index: 0
           * Should update the counter
           */
          expect(mockGetCaseId).nthCalledWith(1, {
            counter: 2,
            grouping: { 'dest.ip': '0.0.0.1', 'host.name': 'A' },
            owner: 'cases',
            ruleId: 'rule-test-id',
            spaceId: 'default',
          });

          /**
           * Oracle record index: 1
           * Should not update the counter
           */
          expect(mockGetCaseId).nthCalledWith(2, {
            counter: 1,
            grouping: { 'dest.ip': '0.0.0.1', 'host.name': 'B' },
            owner: 'cases',
            ruleId: 'rule-test-id',
            spaceId: 'default',
          });

          /**
           * Oracle record index: 3
           * Not found. Created.
           */
          expect(mockGetCaseId).nthCalledWith(3, {
            counter: 1,
            grouping: { 'dest.ip': '0.0.0.3', 'host.name': 'B' },
            owner: 'cases',
            ruleId: 'rule-test-id',
            spaceId: 'default',
          });
        });

        it('gets the cases correctly', async () => {
          await connectorExecutor.execute(params);

          expect(casesClientMock.cases.bulkGet).toHaveBeenCalledWith({
            ids: ['mock-id-1', 'mock-id-2', 'mock-id-3'],
          });
        });

        it('creates non existing cases correctly', async () => {
          casesClientMock.cases.bulkCreate.mockResolvedValue({ cases: [cases[2]] });
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [cases[0], cases[1]],
            errors: [
              {
                error: 'Not found',
                message: 'Not found',
                status: 404,
                caseId: 'mock-id-3',
              },
            ],
          });

          await connectorExecutor.execute(params);

          expect(casesClientMock.cases.bulkCreate).toHaveBeenCalledWith({
            cases: [
              {
                id: 'mock-id-3',
                title: 'Test rule (Auto-created)',
                description:
                  'This case is auto-created by [Test rule](https://example.com/rules/rule-test-id). \n\n Grouping: `host.name` equals `B` and `dest.ip` equals `0.0.0.3`',
                owner: 'cases',
                settings: {
                  syncAlerts: false,
                },
                tags: [
                  'auto-generated',
                  'rule:rule-test-id',
                  'host.name:B',
                  'dest.ip:0.0.0.3',
                  ...rule.tags,
                ],
                connector: {
                  fields: null,
                  id: 'none',
                  name: 'none',
                  type: '.none',
                },
                customFields: [],
              },
            ],
          });
        });

        it('does not add the rule URL to the description if the ruleUrl is null', async () => {
          mockBulkGetRecords.mockResolvedValue([oracleRecords[0]]);
          casesClientMock.cases.bulkCreate.mockResolvedValue({ cases: [cases[0]] });
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [],
            errors: [
              {
                error: 'Not found',
                message: 'Not found',
                status: 404,
                caseId: 'mock-id-1',
              },
            ],
          });

          await connectorExecutor.execute({
            ...params,
            rule: { ...params.rule, ruleUrl: null },
          });

          const description =
            casesClientMock.cases.bulkCreate.mock.calls[0][0].cases[0].description;

          expect(description).toBe(
            'This case is auto-created by Test rule. \n\n Grouping: `host.name` equals `A` and `dest.ip` equals `0.0.0.1`'
          );
        });

        it('converts grouping values in the description correctly', async () => {
          mockBulkGetRecords.mockResolvedValue([oracleRecords[0]]);
          casesClientMock.cases.bulkCreate.mockResolvedValue({ cases: [cases[0]] });
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [],
            errors: [
              {
                error: 'Not found',
                message: 'Not found',
                status: 404,
                caseId: 'mock-id-1',
              },
            ],
          });

          await connectorExecutor.execute({
            ...params,
            alerts: [
              {
                _id: 'test-id',
                _index: 'test-index',
                foo: ['bar', 1, true, {}],
                bar: { foo: 'test' },
                baz: 'my value',
              },
            ],
            groupingBy: ['foo', 'bar', 'baz'],
          });

          const description =
            casesClientMock.cases.bulkCreate.mock.calls[0][0].cases[0].description;

          expect(description).toBe(
            'This case is auto-created by [Test rule](https://example.com/rules/rule-test-id). \n\n Grouping: `foo` equals `["bar",1,true,{}]` and `bar.foo` equals `test` and `baz` equals `my value`'
          );
        });

        it(`adds the counter correctly if it is bigger than ${INITIAL_ORACLE_RECORD_COUNTER}`, async () => {
          mockBulkGetRecords.mockResolvedValue([{ ...oracleRecords[0], counter: 2 }]);
          casesClientMock.cases.bulkCreate.mockResolvedValue({ cases: [cases[0]] });
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [],
            errors: [
              {
                error: 'Not found',
                message: 'Not found',
                status: 404,
                caseId: 'mock-id-1',
              },
            ],
          });

          await connectorExecutor.execute({ ...params, groupingBy: [] });
          const title = casesClientMock.cases.bulkCreate.mock.calls[0][0].cases[0].title;

          expect(title).toBe('Test rule (2) (Auto-created)');
        });

        it(`trims the title correctly if the rule title including the suffix is bigger than ${MAX_TITLE_LENGTH}`, async () => {
          mockBulkGetRecords.mockResolvedValue([{ ...oracleRecords[0], counter: 2 }]);
          casesClientMock.cases.bulkCreate.mockResolvedValue({ cases: [cases[0]] });
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [],
            errors: [
              {
                error: 'Not found',
                message: 'Not found',
                status: 404,
                caseId: 'mock-id-1',
              },
            ],
          });

          await connectorExecutor.execute({
            ...params,
            groupingBy: [],
            rule: { ...params.rule, name: 'a'.repeat(MAX_TITLE_LENGTH) },
          });

          const title = casesClientMock.cases.bulkCreate.mock.calls[0][0].cases[0].title;

          expect(title.length).toBe(MAX_TITLE_LENGTH);
          expect(title.includes('(2) (Auto-created)')).toBe(true);
        });

        it(`trims tags that are bigger than ${MAX_LENGTH_PER_TAG} characters`, async () => {
          mockBulkGetRecords.mockResolvedValue([oracleRecords[0]]);
          casesClientMock.cases.bulkCreate.mockResolvedValue({ cases: [cases[0]] });
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [],
            errors: [
              {
                error: 'Not found',
                message: 'Not found',
                status: 404,
                caseId: 'mock-id-1',
              },
            ],
          });

          await connectorExecutor.execute({
            ...params,
            rule: { ...params.rule, tags: ['a'.repeat(MAX_LENGTH_PER_TAG * 2)] },
          });

          const tags = casesClientMock.cases.bulkCreate.mock.calls[0][0].cases[0].tags;

          expect(tags).toEqual([
            'auto-generated',
            'rule:rule-test-id',
            'host.name:A',
            'dest.ip:0.0.0.1',
            'a'.repeat(MAX_LENGTH_PER_TAG),
          ]);
        });

        it(`create cases with up to ${MAX_TAGS_PER_CASE} tags`, async () => {
          mockBulkGetRecords.mockResolvedValue([oracleRecords[0]]);
          casesClientMock.cases.bulkCreate.mockResolvedValue({ cases: [cases[0]] });
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [],
            errors: [
              {
                error: 'Not found',
                message: 'Not found',
                status: 404,
                caseId: 'mock-id-1',
              },
            ],
          });

          await connectorExecutor.execute({
            ...params,
            rule: { ...params.rule, tags: Array(MAX_TAGS_PER_CASE * 2).fill('foo') },
          });

          const tags = casesClientMock.cases.bulkCreate.mock.calls[0][0].cases[0].tags;
          const systemTags = [
            'auto-generated',
            'rule:rule-test-id',
            'host.name:A',
            'dest.ip:0.0.0.1',
          ];

          expect(tags).toEqual([
            'auto-generated',
            'rule:rule-test-id',
            'host.name:A',
            'dest.ip:0.0.0.1',
            ...Array(MAX_TAGS_PER_CASE - systemTags.length).fill('foo'),
          ]);
        });

        it('converts grouping values in tags correctly', async () => {
          mockBulkGetRecords.mockResolvedValue([oracleRecords[0]]);
          casesClientMock.cases.bulkCreate.mockResolvedValue({ cases: [cases[0]] });
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [],
            errors: [
              {
                error: 'Not found',
                message: 'Not found',
                status: 404,
                caseId: 'mock-id-1',
              },
            ],
          });

          await connectorExecutor.execute({
            ...params,
            alerts: [
              {
                _id: 'test-id',
                _index: 'test-index',
                foo: ['bar', 1, true, {}],
                bar: { foo: 'test' },
                baz: 'my value',
              },
            ],
            groupingBy: ['foo', 'bar', 'baz'],
          });

          const tags = casesClientMock.cases.bulkCreate.mock.calls[0][0].cases[0].tags;

          expect(tags).toEqual([
            'auto-generated',
            'rule:rule-test-id',
            'foo:["bar",1,true,{}]',
            'bar.foo:test',
            'baz:my value',
            'rule',
            'test',
          ]);
        });

        it('does not reopen closed cases if reopenClosedCases=false', async () => {
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [{ ...cases[0], status: CaseStatuses.closed }],
            errors: [],
          });

          await connectorExecutor.execute({
            ...params,
            reopenClosedCases: false,
          });

          expect(casesClientMock.cases.bulkUpdate).not.toHaveBeenCalled();
        });

        it('reopen closed cases if reopenClosedCases=true', async () => {
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [{ ...cases[0], status: CaseStatuses.closed }, cases[1]],
            errors: [],
          });

          await connectorExecutor.execute({
            ...params,
            reopenClosedCases: true,
          });

          expect(casesClientMock.cases.bulkUpdate).toHaveBeenCalledWith({
            cases: [{ id: cases[0].id, status: 'open', version: cases[0].version }],
          });
        });

        it('creates new cases if reopenClosedCases=false and there are closed cases', async () => {
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [{ ...cases[0], status: CaseStatuses.closed }, cases[1]],
            errors: [],
          });

          mockBulkUpdateRecord.mockResolvedValue([{ ...oracleRecords[0], counter: 2 }]);

          await connectorExecutor.execute({
            ...params,
            reopenClosedCases: false,
          });

          expect(mockBulkUpdateRecord).toHaveBeenCalledWith([
            { payload: { counter: 2 }, recordId: 'so-oracle-record-0', version: 'so-version-0' },
          ]);

          expect(casesClientMock.cases.bulkCreate).toHaveBeenCalledWith({
            cases: [
              {
                id: 'mock-id-4',
                title: 'Test rule (Auto-created)',
                description:
                  'This case is auto-created by [Test rule](https://example.com/rules/rule-test-id). \n\n Grouping: `host.name` equals `A` and `dest.ip` equals `0.0.0.1`',
                owner: 'cases',
                settings: {
                  syncAlerts: false,
                },
                tags: [
                  'auto-generated',
                  'rule:rule-test-id',
                  'host.name:A',
                  'dest.ip:0.0.0.1',
                  ...rule.tags,
                ],
                connector: {
                  fields: null,
                  id: 'none',
                  name: 'none',
                  type: '.none',
                },
                customFields: [],
              },
            ],
          });
        });

        describe('Custom Fields', () => {
          const mockOwner = params.owner;
          const mockConfiguration = [
            {
              owner: mockOwner,
              customFields: [
                {
                  key: 'first_key',
                  type: CustomFieldTypes.TEXT,
                  label: 'text 1',
                  required: true,
                  defaultValue: 'default value',
                },
                {
                  key: 'second_key',
                  type: CustomFieldTypes.TOGGLE,
                  label: 'toggle 1',
                  required: true,
                  defaultValue: true,
                },
                {
                  key: 'third_key',
                  type: CustomFieldTypes.TEXT,
                  label: 'text 2',
                  required: true,
                  // no defaultValue
                },
                {
                  key: 'fourth_key',
                  type: CustomFieldTypes.TOGGLE,
                  label: 'toggle 2',
                  required: true,
                  // no defaultValue
                },
              ],
            },
          ];
          const expectedCustomFieldValues = [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT as const,
              value: 'default value',
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE as const,
              value: true,
            },
            {
              key: 'third_key',
              type: CustomFieldTypes.TEXT as const,
              value: 'N/A',
            },
            {
              key: 'fourth_key',
              type: CustomFieldTypes.TOGGLE as const,
              value: false,
            },
          ];

          it('creates non existing cases with required custom fields correctly', async () => {
            casesClientMock.configure.get = jest.fn().mockResolvedValue(mockConfiguration);

            casesClientMock.cases.bulkCreate.mockResolvedValue({ cases: [cases[2]] });
            casesClientMock.cases.bulkGet.mockResolvedValue({
              cases: [cases[0], cases[1]],
              errors: [
                {
                  error: 'Not found',
                  message: 'Not found',
                  status: 404,
                  caseId: 'mock-id-3',
                },
              ],
            });

            await connectorExecutor.execute(params);

            expect(casesClientMock.cases.bulkCreate).toHaveBeenCalledWith({
              cases: [
                {
                  id: 'mock-id-3',
                  title: 'Test rule (Auto-created)',
                  description:
                    'This case is auto-created by [Test rule](https://example.com/rules/rule-test-id). \n\n Grouping: `host.name` equals `B` and `dest.ip` equals `0.0.0.3`',
                  owner: mockOwner,
                  settings: {
                    syncAlerts: false,
                  },
                  tags: [
                    'auto-generated',
                    'rule:rule-test-id',
                    'host.name:B',
                    'dest.ip:0.0.0.3',
                    ...rule.tags,
                  ],
                  connector: {
                    fields: null,
                    id: 'none',
                    name: 'none',
                    type: '.none',
                  },
                  customFields: expectedCustomFieldValues,
                },
              ],
            });
          });

          it('creates new cases with required custom fields if reopenClosedCases=false and there are closed cases', async () => {
            casesClientMock.configure.get = jest.fn().mockResolvedValue(mockConfiguration);

            casesClientMock.cases.bulkGet.mockResolvedValue({
              cases: [{ ...cases[0], status: CaseStatuses.closed }, cases[1]],
              errors: [],
            });

            mockBulkUpdateRecord.mockResolvedValue([{ ...oracleRecords[0], counter: 2 }]);

            await connectorExecutor.execute({
              ...params,
              reopenClosedCases: false,
            });

            expect(mockBulkUpdateRecord).toHaveBeenCalledWith([
              { payload: { counter: 2 }, recordId: 'so-oracle-record-0', version: 'so-version-0' },
            ]);

            expect(casesClientMock.cases.bulkCreate).toHaveBeenCalledWith({
              cases: [
                {
                  id: 'mock-id-4',
                  title: 'Test rule (Auto-created)',
                  description:
                    'This case is auto-created by [Test rule](https://example.com/rules/rule-test-id). \n\n Grouping: `host.name` equals `A` and `dest.ip` equals `0.0.0.1`',
                  owner: mockOwner,
                  settings: {
                    syncAlerts: false,
                  },
                  tags: [
                    'auto-generated',
                    'rule:rule-test-id',
                    'host.name:A',
                    'dest.ip:0.0.0.1',
                    ...rule.tags,
                  ],

                  connector: {
                    fields: null,
                    id: 'none',
                    name: 'none',
                    type: '.none',
                  },
                  customFields: expectedCustomFieldValues,
                },
              ],
            });
          });
        });
      });

      describe('Alerts', () => {
        it('attach the alerts to the correct cases correctly', async () => {
          await connectorExecutor.execute(params);

          expectCasesToHaveTheCorrectAlertsAttachedWithGrouping(casesClientMock);
        });

        it('attach alerts with nested grouping', async () => {
          await connectorExecutor.execute({ ...params, alerts: alertsNested });

          expectCasesToHaveTheCorrectAlertsAttachedWithGrouping(casesClientMock);
        });

        it('attaches alerts to reopened cases', async () => {
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [{ ...cases[0], status: CaseStatuses.closed }],
            errors: [],
          });

          casesClientMock.cases.bulkUpdate.mockResolvedValue([
            { ...cases[0], status: CaseStatuses.open },
          ]);

          await connectorExecutor.execute({
            ...params,
            reopenClosedCases: true,
          });

          expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(1);
          expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
            caseId: 'mock-id-1',
            attachments: [
              {
                alertId: ['alert-id-0', 'alert-id-2'],
                index: ['alert-index-0', 'alert-index-2'],
                owner: 'securitySolution',
                rule: {
                  id: 'rule-test-id',
                  name: 'Test rule',
                },
                type: 'alert',
              },
            ],
          });
        });

        it('attaches alerts to new created cases if they were closed', async () => {
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [{ ...cases[0], status: CaseStatuses.closed }],
            errors: [],
          });

          mockBulkUpdateRecord.mockResolvedValue([{ ...oracleRecords[0], counter: 2 }]);
          casesClientMock.cases.bulkCreate.mockResolvedValue({
            cases: [{ ...cases[0], id: 'mock-id-4' }],
          });

          await connectorExecutor.execute({
            ...params,
            reopenClosedCases: false,
          });

          expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(1);
          expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
            caseId: 'mock-id-4',
            attachments: [
              {
                alertId: ['alert-id-0', 'alert-id-2'],
                index: ['alert-index-0', 'alert-index-2'],
                owner: 'securitySolution',
                rule: {
                  id: 'rule-test-id',
                  name: 'Test rule',
                },
                type: 'alert',
              },
            ],
          });
        });

        it('does not attach alerts to cases that have surpass the limit', async () => {
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [{ ...cases[0], totalAlerts: MAX_ALERTS_PER_CASE }],
            errors: [],
          });

          await connectorExecutor.execute(params);

          expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(0);
          expect(mockLogger.warn).toHaveBeenCalledWith(
            'Cases with ids "mock-id-1" contain more than 1000 alerts. The new alerts will not be attached to the cases. Total new alerts: 1',
            { tags: ['cases-connector', 'rule:rule-test-id'], labels: {} }
          );
        });

        it('does not attach alerts to cases when attaching the new alerts will surpass the limit', async () => {
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [
              {
                ...cases[0],
                totalAlerts: MAX_ALERTS_PER_CASE - groupedAlertsWithOracleKey[0].alerts.length + 1,
              },
            ],
            errors: [],
          });

          await connectorExecutor.execute(params);

          expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(0);
          expect(mockLogger.warn).toHaveBeenCalledWith(
            'Cases with ids "mock-id-1" contain more than 1000 alerts. The new alerts will not be attached to the cases. Total new alerts: 1',
            { tags: ['cases-connector', 'rule:rule-test-id'], labels: {} }
          );
        });

        it('attach alerts to cases when attaching the new alerts will be equal to the limit', async () => {
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [
              {
                ...cases[0],
                totalAlerts: MAX_ALERTS_PER_CASE - groupedAlertsWithOracleKey[0].alerts.length,
              },
            ],
            errors: [],
          });

          await connectorExecutor.execute(params);

          expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(1);
        });
      });

      describe('Error handling', () => {
        it('throws an error when bulk getting records and there are different errors from 404', async () => {
          mockBulkGetRecords.mockResolvedValue([
            {
              id: groupedAlertsWithOracleKey[2].oracleKey,
              type: CASE_RULES_SAVED_OBJECT,
              message: 'getting records: mockBulkGetRecords error',
              statusCode: 409,
              error: 'Conflict',
            },
            {
              id: groupedAlertsWithOracleKey[2].oracleKey,
              type: CASE_RULES_SAVED_OBJECT,
              message: 'Input not accepted',
              statusCode: 400,
              error: 'Bad request',
            },
          ]);

          await expect(() =>
            connectorExecutor.execute(params)
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Conflict: getting records: mockBulkGetRecords error"`
          );

          expect(mockBulkCreateRecords).not.toHaveBeenCalled();
        });

        it('throws an error when bulk creating non found records and there is an error', async () => {
          mockBulkCreateRecords.mockResolvedValue([
            {
              id: groupedAlertsWithOracleKey[2].oracleKey,
              type: CASE_RULES_SAVED_OBJECT,
              message: 'creating records: mockBulkCreateRecords error',
              statusCode: 400,
              error: 'Bad request',
            },
            {
              id: groupedAlertsWithOracleKey[2].oracleKey,
              type: CASE_RULES_SAVED_OBJECT,
              message: 'Version mismatch',
              statusCode: 409,
              error: 'Conflict',
            },
          ]);

          await expect(() =>
            connectorExecutor.execute(params)
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Bad request: creating records: mockBulkCreateRecords error"`
          );

          expect(casesClientMock.cases.bulkGet).not.toHaveBeenCalled();
        });

        it('throws an error when updating the counter if the time window has passed and there is an error', async () => {
          dateMathMock.parse.mockImplementation(() => moment('2023-11-10T10:23:42.769Z'));

          mockBulkUpdateRecord.mockResolvedValue([
            {
              id: groupedAlertsWithOracleKey[2].oracleKey,
              type: CASE_RULES_SAVED_OBJECT,
              message: 'timeWindow: bulkUpdateRecord error',
              statusCode: 400,
              error: 'Bad request',
            },
            {
              id: groupedAlertsWithOracleKey[2].oracleKey,
              type: CASE_RULES_SAVED_OBJECT,
              message: 'Version mismatch',
              statusCode: 409,
              error: 'Conflict',
            },
          ]);

          await expect(() =>
            connectorExecutor.execute(params)
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Bad request: timeWindow: bulkUpdateRecord error"`
          );

          expect(casesClientMock.cases.bulkGet).not.toHaveBeenCalled();
        });

        it('throws an error when bulk getting cases and there are different errors from 404', async () => {
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [cases[0], cases[1]],
            errors: [
              {
                error: 'Forbidden',
                message: 'getting cases: bulkGet error',
                status: 403,
                caseId: 'mock-id-3',
              },
              {
                message: 'Input not accepted',
                status: 400,
                error: 'Bad request',
                caseId: 'mock-id-4',
              },
            ],
          });

          await expect(() =>
            connectorExecutor.execute(params)
          ).rejects.toThrowErrorMatchingInlineSnapshot(`"Forbidden: getting cases: bulkGet error"`);

          expect(casesClientMock.cases.bulkCreate).not.toHaveBeenCalled();
        });

        it('throws an error when bulk creating non found cases and there is an error', async () => {
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [cases[0], cases[1]],
            errors: [
              {
                error: 'Not found',
                message: 'Not found',
                status: 404,
                caseId: 'mock-id-3',
              },
            ],
          });

          casesClientMock.cases.bulkCreate.mockRejectedValue(
            new CaseError('creating non found cases: bulkCreate error')
          );

          await expect(() =>
            connectorExecutor.execute(params)
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"creating non found cases: bulkCreate error"`
          );

          expect(casesClientMock.attachments.bulkCreate).not.toHaveBeenCalled();
        });

        it('throws an error when reopening cases and there is an error', async () => {
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [{ ...cases[0], status: CaseStatuses.closed }],
            errors: [],
          });

          casesClientMock.cases.bulkUpdate.mockRejectedValue(
            new CaseError('reopening closed cases: bulkUpdate error')
          );

          await expect(() =>
            connectorExecutor.execute({
              ...params,
              reopenClosedCases: true,
            })
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"reopening closed cases: bulkUpdate error"`
          );

          expect(casesClientMock.attachments.bulkCreate).not.toHaveBeenCalled();
        });

        it('throws an error when creating new cases for closed cases and increasing the counters returns an error', async () => {
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [{ ...cases[0], status: CaseStatuses.closed }],
            errors: [],
          });

          mockBulkUpdateRecord.mockResolvedValue([
            {
              id: groupedAlertsWithOracleKey[2].oracleKey,
              type: CASE_RULES_SAVED_OBJECT,
              message: 'creating new cases for closed cases: bulkUpdateRecord error',
              statusCode: 400,
              error: 'Bad request',
            },
            {
              id: groupedAlertsWithOracleKey[2].oracleKey,
              type: CASE_RULES_SAVED_OBJECT,
              message: 'Version mismatch',
              statusCode: 409,
              error: 'Conflict',
            },
          ]);

          await expect(() =>
            connectorExecutor.execute({
              ...params,
              reopenClosedCases: false,
            })
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Bad request: creating new cases for closed cases: bulkUpdateRecord error"`
          );

          expect(casesClientMock.cases.bulkCreate).not.toHaveBeenCalled();
        });

        it('throws an error when creating new cases for closed cases and there is an error', async () => {
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [{ ...cases[0], status: CaseStatuses.closed }],
            errors: [],
          });

          mockBulkUpdateRecord.mockResolvedValue([{ ...oracleRecords[0], counter: 2 }]);

          casesClientMock.cases.bulkCreate.mockRejectedValue(
            new CaseError('creating non found cases: bulkCreate error')
          );

          await expect(() =>
            connectorExecutor.execute({
              ...params,
              reopenClosedCases: false,
            })
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"creating non found cases: bulkCreate error"`
          );

          expect(casesClientMock.attachments.bulkCreate).not.toHaveBeenCalled();
        });

        it('throws an error if there is an error when attaching alerts to cases', async () => {
          casesClientMock.attachments.bulkCreate.mockRejectedValue(
            new CaseError('attaching alerts: bulkCreate error')
          );

          await expect(() =>
            connectorExecutor.execute(params)
          ).rejects.toThrowErrorMatchingInlineSnapshot(`"attaching alerts: bulkCreate error"`);
        });

        it('throws an error if there is an error when fetching configurations', async () => {
          casesClientMock.configure.get = jest
            .fn()
            .mockRejectedValue(new CaseError('get configuration error'));

          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [],
            errors: [
              {
                error: 'Not found',
                message: 'Not found',
                status: 404,
                caseId: 'mock-id-1',
              },
            ],
          });

          await expect(() =>
            connectorExecutor.execute(params)
          ).rejects.toThrowErrorMatchingInlineSnapshot(`"get configuration error"`);
        });
      });

      describe('Skipping execution', () => {
        it('skips execution if alerts cannot be grouped', async () => {
          await connectorExecutor.execute({
            ...params,
            groupingBy: ['does.not.exists'],
          });

          expect(mockGetRecordId).not.toHaveBeenCalled();
          expect(mockBulkGetRecords).not.toHaveBeenCalled();
          expect(mockBulkCreateRecords).not.toHaveBeenCalled();
          expect(mockBulkUpdateRecord).not.toHaveBeenCalled();
          expect(mockGetCaseId).not.toHaveBeenCalled();
          expect(casesClientMock.cases.bulkGet).not.toHaveBeenCalled();
          expect(casesClientMock.cases.bulkCreate).not.toHaveBeenCalled();
          expect(casesClientMock.cases.bulkUpdate).not.toHaveBeenCalled();
          expect(casesClientMock.configure.get).not.toHaveBeenCalled();
        });
      });
    });
  });

  /**
   * In this testing group we test
   * only the functionality that differs
   * from the testing with grouping
   */
  describe('Without grouping', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // @ts-expect-error: other properties are not required
      CasesOracleServiceMock.mockImplementation(() => {
        return {
          getRecordId: mockGetRecordId.mockImplementation(
            () => `so-oracle-record-${oracleIdCounter++}`
          ),
          bulkGetRecords: mockBulkGetRecords.mockResolvedValue([oracleRecords[0]]),
          bulkCreateRecord: mockBulkCreateRecords.mockResolvedValue([]),
        };
      });

      // @ts-expect-error: other properties are not required
      CasesServiceMock.mockImplementation(() => {
        return {
          getCaseId: mockGetCaseId.mockImplementation(() => `mock-id-${++caseIdCounter}`),
        };
      });

      casesClientMock.cases.bulkGet.mockResolvedValue({ cases: [cases[0]], errors: [] });
      casesClientMock.attachments.bulkCreate.mockResolvedValue(cases[0]);

      getCasesClient.mockReturnValue(casesClientMock);

      connectorExecutor = new CasesConnectorExecutor({
        logger: mockLogger,
        casesOracleService: new CasesOracleServiceMock(),
        casesService: new CasesServiceMock(),
        casesClient: casesClientMock,
        spaceId: 'default',
      });
    });

    describe('Oracle records', () => {
      it('generates the oracle keys correctly with no grouping', async () => {
        await connectorExecutor.execute({ ...params, groupingBy: [] });

        expect(mockGetRecordId).toHaveBeenCalledTimes(1);

        expect(mockGetRecordId).nthCalledWith(1, {
          ruleId: rule.id,
          grouping: {},
          owner,
          spaceId: 'default',
        });
      });

      it('gets the oracle records correctly', async () => {
        await connectorExecutor.execute({ ...params, groupingBy: [] });

        expect(mockBulkGetRecords).toHaveBeenCalledWith(['so-oracle-record-0']);
      });
    });

    describe('Cases', () => {
      it('generates the case ids correctly', async () => {
        await connectorExecutor.execute({ ...params, groupingBy: [] });

        expect(mockGetCaseId).toHaveBeenCalledTimes(1);

        expect(mockGetCaseId).nthCalledWith(1, {
          ruleId: rule.id,
          grouping: {},
          owner,
          spaceId: 'default',
          counter: 1,
        });
      });

      it('gets the cases correctly', async () => {
        await connectorExecutor.execute({ ...params, groupingBy: [] });

        expect(casesClientMock.cases.bulkGet).toHaveBeenCalledWith({
          ids: ['mock-id-1'],
        });
      });
    });

    describe('Alerts', () => {
      it('attach all alerts to the same case when the grouping is not defined', async () => {
        await connectorExecutor.execute({ ...params, groupingBy: [] });

        expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(1);

        expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
          caseId: 'mock-id-1',
          attachments: [
            {
              alertId: alerts.map((alert) => alert._id),
              index: alerts.map((alert) => alert._index),
              owner: 'securitySolution',
              rule: {
                id: 'rule-test-id',
                name: 'Test rule',
              },
              type: 'alert',
            },
          ],
        });
      });
    });
  });

  describe('Retries', () => {
    it('attaches the alerts correctly when bulkGetRecords fails', async () => {
      mockBulkGetRecords
        .mockResolvedValueOnce([
          {
            id: groupedAlertsWithOracleKey[2].oracleKey,
            type: CASE_RULES_SAVED_OBJECT,
            message: 'getting records: mockBulkGetRecords error',
            statusCode: 409,
            error: 'Conflict',
          },
        ])
        .mockResolvedValueOnce(oracleRecords);

      await expect(() =>
        connectorExecutor.execute(params)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Conflict: getting records: mockBulkGetRecords error"`
      );

      resetCounters();

      // retry
      await connectorExecutor.execute(params);

      expectCasesToHaveTheCorrectAlertsAttachedWithGrouping(casesClientMock);
    });

    it('attaches the alerts correctly when bulkCreateRecord fails', async () => {
      mockBulkCreateRecords
        .mockResolvedValueOnce([
          {
            id: groupedAlertsWithOracleKey[2].oracleKey,
            type: CASE_RULES_SAVED_OBJECT,
            message: 'creating records: bulkCreateRecord error',
            statusCode: 409,
            error: 'Conflict',
          },
        ])
        .mockResolvedValueOnce([createdOracleRecord]);

      await expect(() =>
        connectorExecutor.execute(params)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Conflict: creating records: bulkCreateRecord error"`
      );

      resetCounters();

      // retry
      await connectorExecutor.execute(params);

      expectCasesToHaveTheCorrectAlertsAttachedWithGrouping(casesClientMock);
    });

    it('attaches the alerts correctly while creating a record and another node has already created it', async () => {
      // the last record in oracleRecords is a 404
      mockBulkGetRecords
        .mockResolvedValueOnce(oracleRecords)
        .mockResolvedValueOnce([oracleRecords[0], oracleRecords[1], createdOracleRecord]);

      mockBulkCreateRecords.mockResolvedValueOnce([
        {
          id: groupedAlertsWithOracleKey[2].oracleKey,
          type: CASE_RULES_SAVED_OBJECT,
          message: 'creating records: bulkCreateRecord error',
          statusCode: 409,
          error: 'Conflict',
        },
      ]);

      await expect(() =>
        connectorExecutor.execute(params)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Conflict: creating records: bulkCreateRecord error"`
      );

      resetCounters();

      // retry
      await connectorExecutor.execute(params);

      // called only once when the conflict occurs
      expect(mockBulkCreateRecords).toHaveBeenCalledTimes(1);
      expectCasesToHaveTheCorrectAlertsAttachedWithGrouping(casesClientMock);
    });

    it('attaches the alerts correctly when increasing the counter (time window) fails', async () => {
      dateMathMock.parse.mockImplementation(() => moment('2023-11-10T10:23:42.769Z'));

      mockBulkUpdateRecord
        .mockResolvedValueOnce([
          {
            id: groupedAlertsWithOracleKey[2].oracleKey,
            type: CASE_RULES_SAVED_OBJECT,
            message: 'updating records: mockBulkUpdateRecord error',
            statusCode: 409,
            error: 'Conflict',
          },
        ])
        .mockResolvedValueOnce([{ ...oracleRecords[0], counter: 2 }]);

      await expect(() =>
        connectorExecutor.execute(params)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Conflict: updating records: mockBulkUpdateRecord error"`
      );

      resetCounters();

      mockGetCaseId
        .mockReturnValueOnce('mock-id-4')
        .mockReturnValueOnce('mock-id-1')
        .mockReturnValueOnce('mock-id-2');

      casesClientMock.cases.bulkGet.mockResolvedValue({
        cases: [cases[0], cases[1]],
        errors: [
          {
            error: 'Not found',
            message: 'Not found',
            status: 404,
            caseId: 'mock-id-4',
          },
        ],
      });

      casesClientMock.cases.bulkCreate.mockResolvedValue({
        cases: [{ ...cases[0], id: 'mock-id-4' }],
      });

      // retry
      await connectorExecutor.execute(params);

      expectCasesToHaveTheCorrectAlertsAttachedWithGroupingAndIncreasedCounter(casesClientMock);
    });

    it('attaches the alerts correctly when increasing the counter (time window) and another node has already increased it', async () => {
      dateMathMock.parse.mockImplementation(() => moment('2023-10-11T10:23:42.769Z'));

      mockBulkGetRecords
        // counter is 1
        .mockResolvedValueOnce([oracleRecords[0], oracleRecords[1]])
        .mockResolvedValueOnce([
          {
            ...createdOracleRecord,
            // another node increased the counter
            counter: 2,
            id: groupedAlertsWithOracleKey[0].oracleKey,
            grouping: groupedAlertsWithOracleKey[0].grouping,
            version: 'so-version-3',
            createdAt: '2023-11-13T10:23:42.769Z',
            updatedAt: '2023-11-13T10:23:42.769Z',
          },
          oracleRecords[1],
        ]);

      // conflict error. Another node had updated the record.
      mockBulkUpdateRecord.mockResolvedValueOnce([
        {
          id: groupedAlertsWithOracleKey[0].oracleKey,
          type: CASE_RULES_SAVED_OBJECT,
          message: 'updating records: mockBulkUpdateRecord error',
          statusCode: 409,
          error: 'Conflict',
        },
      ]);

      await expect(() =>
        connectorExecutor.execute(params)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Conflict: updating records: mockBulkUpdateRecord error"`
      );

      resetCounters();

      mockGetCaseId.mockReturnValueOnce('mock-id-4').mockReturnValueOnce('mock-id-2');

      casesClientMock.cases.bulkGet.mockResolvedValue({
        cases: [cases[1]],
        errors: [
          {
            error: 'Not found',
            message: 'Not found',
            status: 404,
            caseId: 'mock-id-4',
          },
        ],
      });

      casesClientMock.cases.bulkCreate.mockResolvedValue({
        cases: [{ ...cases[0], id: 'mock-id-4' }],
      });

      // retry
      await connectorExecutor.execute(params);

      expect(mockGetCaseId).toHaveBeenCalledTimes(2);
      // case ID is constructed with the new counter and the correct grouping
      expect(mockGetCaseId).nthCalledWith(1, {
        ruleId: rule.id,
        grouping: groupedAlertsWithOracleKey[0].grouping,
        owner,
        spaceId: 'default',
        counter: 2,
      });

      expect(mockGetCaseId).nthCalledWith(2, {
        ruleId: rule.id,
        grouping: groupedAlertsWithOracleKey[1].grouping,
        owner,
        spaceId: 'default',
        counter: 1,
      });

      // called only once when the conflict occurs
      expect(mockBulkUpdateRecord).toHaveBeenCalledTimes(1);
      expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(2);
      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
        caseId: 'mock-id-2',
        attachments: [
          {
            alertId: ['alert-id-1'],
            index: ['alert-index-1'],
            owner: 'securitySolution',
            rule: {
              id: 'rule-test-id',
              name: 'Test rule',
            },
            type: 'alert',
          },
        ],
      });

      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(2, {
        caseId: 'mock-id-4',
        attachments: [
          {
            alertId: ['alert-id-0', 'alert-id-2'],
            index: ['alert-index-0', 'alert-index-2'],
            owner: 'securitySolution',
            rule: {
              id: 'rule-test-id',
              name: 'Test rule',
            },
            type: 'alert',
          },
        ],
      });
    });

    it('attaches the alerts correctly when creating a case and another node has already created', async () => {
      mockBulkGetRecords.mockResolvedValueOnce([
        oracleRecords[0],
        oracleRecords[1],
        createdOracleRecord,
      ]);

      casesClientMock.cases.bulkGet
        .mockResolvedValueOnce({
          cases: [cases[0], cases[1]],
          errors: [
            {
              error: 'Not found',
              message: 'Not found',
              status: 404,
              caseId: 'mock-id-3',
            },
          ],
        })
        .mockResolvedValueOnce({
          cases,
          errors: [],
        });

      casesClientMock.cases.bulkCreate.mockRejectedValue(
        new CaseError('creating non found cases: bulkCreate error')
      );

      await expect(() =>
        connectorExecutor.execute(params)
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"creating non found cases: bulkCreate error"`);

      resetCounters();

      // retry
      await connectorExecutor.execute(params);

      // called only once when the conflict occurs
      expect(casesClientMock.cases.bulkCreate).toHaveBeenCalledTimes(1);

      expectCasesToHaveTheCorrectAlertsAttachedWithGrouping(casesClientMock);
    });

    it('attaches the alerts correctly when reopening a case and another node has already reopened it', async () => {
      mockBulkGetRecords.mockResolvedValueOnce([oracleRecords[0], oracleRecords[1]]);

      casesClientMock.cases.bulkGet
        .mockResolvedValueOnce({
          cases: [{ ...cases[0], status: CaseStatuses.closed }, cases[1]],
          errors: [],
        })
        .mockResolvedValueOnce({
          cases: [cases[0], cases[1]],
          errors: [],
        });

      casesClientMock.cases.bulkUpdate.mockRejectedValue(
        new CaseError('reopening closed cases: bulkUpdate error')
      );

      await expect(() =>
        connectorExecutor.execute({
          ...params,
          reopenClosedCases: true,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"reopening closed cases: bulkUpdate error"`);

      resetCounters();

      // retry
      await connectorExecutor.execute({
        ...params,
        reopenClosedCases: true,
      });

      // called only once when the conflict occurs
      expect(casesClientMock.cases.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(2);

      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
        caseId: 'mock-id-1',
        attachments: [
          {
            alertId: ['alert-id-0', 'alert-id-2'],
            index: ['alert-index-0', 'alert-index-2'],
            owner: 'securitySolution',
            rule: {
              id: 'rule-test-id',
              name: 'Test rule',
            },
            type: 'alert',
          },
        ],
      });

      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(2, {
        caseId: 'mock-id-2',
        attachments: [
          {
            alertId: ['alert-id-1'],
            index: ['alert-index-1'],
            owner: 'securitySolution',
            rule: {
              id: 'rule-test-id',
              name: 'Test rule',
            },
            type: 'alert',
          },
        ],
      });
    });

    it('attaches the alerts correctly when increasing the counter (closed case) and another node has already increased it', async () => {
      mockBulkGetRecords
        .mockResolvedValueOnce([oracleRecords[0], oracleRecords[1]])
        .mockResolvedValueOnce([updatedCounterOracleRecord, oracleRecords[1]]);

      casesClientMock.cases.bulkGet
        .mockResolvedValueOnce({
          cases: [{ ...cases[0], status: CaseStatuses.closed }, cases[1]],
          errors: [],
        })
        .mockResolvedValueOnce({
          cases: [{ ...cases[0], id: 'mock-id-4' }, cases[1]],
          errors: [],
        });

      // conflict error. Another node had updated the record.
      mockBulkUpdateRecord.mockResolvedValueOnce([
        {
          id: groupedAlertsWithOracleKey[0].oracleKey,
          type: CASE_RULES_SAVED_OBJECT,
          message: 'updating records: mockBulkUpdateRecord error',
          statusCode: 409,
          error: 'Conflict',
        },
      ]);

      await expect(() =>
        connectorExecutor.execute({
          ...params,
          reopenClosedCases: false,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Conflict: updating records: mockBulkUpdateRecord error"`
      );

      resetCounters();

      mockGetCaseId.mockReturnValueOnce('mock-id-4').mockReturnValueOnce('mock-id-2');

      // retry
      await connectorExecutor.execute({
        ...params,
        reopenClosedCases: false,
      });

      // called only once when the conflict occurs
      expect(mockBulkUpdateRecord).toHaveBeenCalledTimes(1);
      expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(2);
      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
        caseId: 'mock-id-4',
        attachments: [
          {
            alertId: ['alert-id-0', 'alert-id-2'],
            index: ['alert-index-0', 'alert-index-2'],
            owner: 'securitySolution',
            rule: {
              id: 'rule-test-id',
              name: 'Test rule',
            },
            type: 'alert',
          },
        ],
      });

      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(2, {
        caseId: 'mock-id-2',
        attachments: [
          {
            alertId: ['alert-id-1'],
            index: ['alert-index-1'],
            owner: 'securitySolution',
            rule: {
              id: 'rule-test-id',
              name: 'Test rule',
            },
            type: 'alert',
          },
        ],
      });
    });

    it('attaches the alerts correctly when creating a case for a closed and another node has already created it', async () => {
      mockBulkGetRecords
        .mockResolvedValueOnce([oracleRecords[0], oracleRecords[1]])
        .mockResolvedValueOnce([updatedCounterOracleRecord, oracleRecords[1]]);

      casesClientMock.cases.bulkGet
        .mockResolvedValueOnce({
          cases: [{ ...cases[0], status: CaseStatuses.closed }, cases[1]],
          errors: [],
        })
        .mockResolvedValueOnce({
          cases: [{ ...cases[0], id: 'mock-id-4' }, cases[1]],
          errors: [],
        });

      mockBulkUpdateRecord.mockResolvedValueOnce([updatedCounterOracleRecord]);

      casesClientMock.cases.bulkCreate.mockRejectedValue(
        new CaseError('creating new case for closed case: bulkCreate error')
      );

      await expect(() =>
        connectorExecutor.execute({
          ...params,
          reopenClosedCases: false,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"creating new case for closed case: bulkCreate error"`
      );

      resetCounters();

      mockGetCaseId.mockReturnValueOnce('mock-id-4').mockReturnValueOnce('mock-id-2');

      // retry
      await connectorExecutor.execute({
        ...params,
        reopenClosedCases: false,
      });

      // called only once when the conflict occurs
      expect(casesClientMock.cases.bulkCreate).toHaveBeenCalledTimes(1);
      expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(2);
      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
        caseId: 'mock-id-4',
        attachments: [
          {
            alertId: ['alert-id-0', 'alert-id-2'],
            index: ['alert-index-0', 'alert-index-2'],
            owner: 'securitySolution',
            rule: {
              id: 'rule-test-id',
              name: 'Test rule',
            },
            type: 'alert',
          },
        ],
      });

      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(2, {
        caseId: 'mock-id-2',
        attachments: [
          {
            alertId: ['alert-id-1'],
            index: ['alert-index-1'],
            owner: 'securitySolution',
            rule: {
              id: 'rule-test-id',
              name: 'Test rule',
            },
            type: 'alert',
          },
        ],
      });
    });

    it('attach the alerts correctly when attaching the alerts fail', async () => {
      casesClientMock.attachments.bulkCreate.mockRejectedValueOnce(
        new CaseError('attaching alerts: bulkCreate error')
      );

      await expect(() =>
        connectorExecutor.execute({
          ...params,
          reopenClosedCases: false,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"attaching alerts: bulkCreate error"`);

      resetCounters();

      // retry
      await connectorExecutor.execute({
        ...params,
        reopenClosedCases: false,
      });

      expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(6);
      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
        caseId: 'mock-id-1',
        attachments: [
          {
            alertId: ['alert-id-0', 'alert-id-2'],
            index: ['alert-index-0', 'alert-index-2'],
            owner: 'securitySolution',
            rule: {
              id: 'rule-test-id',
              name: 'Test rule',
            },
            type: 'alert',
          },
        ],
      });

      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(4, {
        caseId: 'mock-id-1',
        attachments: [
          {
            alertId: ['alert-id-0', 'alert-id-2'],
            index: ['alert-index-0', 'alert-index-2'],
            owner: 'securitySolution',
            rule: {
              id: 'rule-test-id',
              name: 'Test rule',
            },
            type: 'alert',
          },
        ],
      });

      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(2, {
        caseId: 'mock-id-2',
        attachments: [
          {
            alertId: ['alert-id-1'],
            index: ['alert-index-1'],
            owner: 'securitySolution',
            rule: {
              id: 'rule-test-id',
              name: 'Test rule',
            },
            type: 'alert',
          },
        ],
      });

      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(5, {
        caseId: 'mock-id-2',
        attachments: [
          {
            alertId: ['alert-id-1'],
            index: ['alert-index-1'],
            owner: 'securitySolution',
            rule: {
              id: 'rule-test-id',
              name: 'Test rule',
            },
            type: 'alert',
          },
        ],
      });

      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(3, {
        caseId: 'mock-id-3',
        attachments: [
          {
            alertId: ['alert-id-3'],
            index: ['alert-index-3'],
            owner: 'securitySolution',
            rule: {
              id: 'rule-test-id',
              name: 'Test rule',
            },
            type: 'alert',
          },
        ],
      });

      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(6, {
        caseId: 'mock-id-3',
        attachments: [
          {
            alertId: ['alert-id-3'],
            index: ['alert-index-3'],
            owner: 'securitySolution',
            rule: {
              id: 'rule-test-id',
              name: 'Test rule',
            },
            type: 'alert',
          },
        ],
      });
    });
  });

  describe('Logging', () => {
    it('logs a warning when parsing the time window results to error', async () => {
      mockBulkGetRecords.mockResolvedValue([oracleRecords[0]]);
      dateMathMock.parse.mockImplementation(() => undefined);

      await connectorExecutor.execute({
        ...params,
        timeWindow: 'invalid',
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[CasesConnector][CasesConnectorExecutor][isTimeWindowPassed] Parsing time window error. Parsing value: "invalid"',
        { labels: {}, tags: ['cases-connector', 'rule:rule-test-id'] }
      );
    });

    it('logs a warning when the last updated date of the oracle record is not valid', async () => {
      mockBulkGetRecords.mockResolvedValue([{ ...oracleRecords[0], updatedAt: 'invalid' }]);

      await connectorExecutor.execute(params);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[CasesConnector][CasesConnectorExecutor][isTimeWindowPassed] Timestamp "invalid" is not a valid date',
        { labels: {}, tags: ['cases-connector', 'rule:rule-test-id'] }
      );
    });
  });

  describe('Circuit breakers', () => {
    describe('user defined', () => {
      it('generates the oracle keys correctly when the total cases to be open is more than maximumCasesToOpen', async () => {
        await connectorExecutor.execute({
          ...params,
          maximumCasesToOpen: 1,
        });

        expect(mockGetRecordId).toHaveBeenCalledTimes(1);
        expect(mockGetRecordId).nthCalledWith(1, {
          ruleId: rule.id,
          grouping: {},
          owner,
          spaceId: 'default',
        });
      });

      it('generates the case ids correctly when the total cases to be open is more than maximumCasesToOpen', async () => {
        await connectorExecutor.execute({
          ...params,
          maximumCasesToOpen: 1,
        });

        expect(mockGetCaseId).toHaveBeenCalledTimes(1);
        expect(mockGetCaseId).nthCalledWith(1, {
          ruleId: rule.id,
          grouping: {},
          owner,
          spaceId: 'default',
          counter: 1,
        });
      });

      it('attach all alerts to the same case when the grouping generates more than maximumCasesToOpen', async () => {
        await connectorExecutor.execute({
          ...params,
          maximumCasesToOpen: 1,
        });

        expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(1);
        expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
          caseId: 'mock-id-1',
          attachments: [
            {
              type: 'alert',
              alertId: ['alert-id-0', 'alert-id-2', 'alert-id-1', 'alert-id-3'],
              index: ['alert-index-0', 'alert-index-2', 'alert-index-1', 'alert-index-3'],
              rule: { id: 'rule-test-id', name: 'Test rule' },
              owner: 'securitySolution',
            },
          ],
        });
      });

      it('logs correctly', async () => {
        await connectorExecutor.execute({
          ...params,
          maximumCasesToOpen: 1,
        });

        expect(mockLogger.warn).toHaveBeenCalledWith(
          `[CasesConnector][CasesConnectorExecutor][applyCircuitBreakers] Circuit breaker: Grouping definition would create more than the maximum number of allowed cases 1. Falling back to one case.`,
          { labels: {}, tags: ['cases-connector', 'rule:rule-test-id'] }
        );
      });
    });

    describe('hard limits', () => {
      const allAlerts = Array.from({ length: MAX_OPEN_CASES + 1 }).map((_, index) => ({
        _id: `alert-id-${index}`,
        _index: `alert-index-${index}`,
        'host.name': `host-${index}`,
      }));

      it('generates the oracle keys correctly when the total cases to be open is more than MAX_OPEN_CASES', async () => {
        await connectorExecutor.execute({
          ...params,
          alerts: allAlerts,
          groupingBy: ['host.name'],
          // MAX_OPEN_CASES < maximumCasesToOpen
          maximumCasesToOpen: 20,
        });

        expect(mockGetRecordId).toHaveBeenCalledTimes(1);
        expect(mockGetRecordId).nthCalledWith(1, {
          ruleId: rule.id,
          grouping: {},
          owner,
          spaceId: 'default',
        });
      });

      it('generates the case ids correctly when the total cases to be open is more than MAX_OPEN_CASES', async () => {
        await connectorExecutor.execute({
          ...params,
          alerts: allAlerts,
          groupingBy: ['host.name'],
          // MAX_OPEN_CASES < maximumCasesToOpen
          maximumCasesToOpen: 20,
        });

        expect(mockGetCaseId).toHaveBeenCalledTimes(1);
        expect(mockGetCaseId).nthCalledWith(1, {
          ruleId: rule.id,
          grouping: {},
          owner,
          spaceId: 'default',
          counter: 1,
        });
      });

      it('attach all alerts to the same case when the grouping generates more than MAX_OPEN_CASES', async () => {
        await connectorExecutor.execute({
          ...params,
          alerts: allAlerts,
          groupingBy: ['host.name'],
          // MAX_OPEN_CASES < maximumCasesToOpen
          maximumCasesToOpen: 20,
        });

        expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(1);
        expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
          caseId: 'mock-id-1',
          attachments: [
            {
              alertId: allAlerts.map((alert) => alert._id),
              index: allAlerts.map((alert) => alert._index),
              owner: 'securitySolution',
              rule: {
                id: 'rule-test-id',
                name: 'Test rule',
              },
              type: 'alert',
            },
          ],
        });
      });

      it('logs correctly', async () => {
        await connectorExecutor.execute({
          ...params,
          alerts: allAlerts,
          groupingBy: ['host.name'],
          // MAX_OPEN_CASES < maximumCasesToOpen
          maximumCasesToOpen: 20,
        });

        expect(mockLogger.warn).toHaveBeenCalledWith(
          `[CasesConnector][CasesConnectorExecutor][applyCircuitBreakers] Circuit breaker: Grouping definition would create more than the maximum number of allowed cases 10. Falling back to one case.`,
          { labels: {}, tags: ['cases-connector', 'rule:rule-test-id'] }
        );
      });
    });
  });

  describe('Sequence of executions with missing oracle or cases', () => {
    const missingDataParams = {
      ...params,
      alerts: [
        {
          _id: 'test-id',
          _index: 'test-index',
          foo: 'bar',
        },
      ],
      groupingBy: ['foo'],
    };

    it('oracle counter increases but some cases are missing', async () => {
      mockGetRecordId.mockReturnValue(oracleRecords[0].id);
      mockBulkGetRecords
        .mockResolvedValueOnce([oracleRecords[0]])
        .mockResolvedValueOnce([{ ...oracleRecords[0], counter: 2 }])
        .mockResolvedValueOnce([{ ...oracleRecords[0], counter: 3 }]);

      mockGetCaseId
        .mockReturnValueOnce('mock-id-1')
        .mockReturnValueOnce('mock-id-2')
        .mockReturnValueOnce('mock-id-3');

      casesClientMock.cases.bulkGet
        .mockResolvedValueOnce({
          cases: [cases[0]],
          errors: [],
        })
        .mockResolvedValueOnce({
          cases: [],
          errors: [
            {
              error: 'Not found',
              message: 'Not found',
              status: 404,
              caseId: cases[1].id,
            },
          ],
        })
        .mockResolvedValueOnce({
          cases: [cases[2]],
          errors: [],
        });

      casesClientMock.cases.bulkCreate.mockResolvedValue({ cases: [cases[1]] });

      await connectorExecutor.execute(missingDataParams);
      await connectorExecutor.execute(missingDataParams);
      await connectorExecutor.execute(missingDataParams);

      expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(3);

      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
        caseId: 'mock-id-1',
        attachments: [
          {
            type: 'alert',
            alertId: ['test-id'],
            index: ['test-index'],
            rule: { id: 'rule-test-id', name: 'Test rule' },
            owner: 'securitySolution',
          },
        ],
      });

      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(2, {
        caseId: 'mock-id-2',
        attachments: [
          {
            type: 'alert',
            alertId: ['test-id'],
            index: ['test-index'],
            rule: { id: 'rule-test-id', name: 'Test rule' },
            owner: 'securitySolution',
          },
        ],
      });

      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(3, {
        caseId: 'mock-id-3',
        attachments: [
          {
            type: 'alert',
            alertId: ['test-id'],
            index: ['test-index'],
            rule: { id: 'rule-test-id', name: 'Test rule' },
            owner: 'securitySolution',
          },
        ],
      });
    });

    it('oracle record is missing but some cases exists', async () => {
      mockGetRecordId.mockReturnValue(oracleRecords[0].id);
      mockBulkGetRecords
        .mockResolvedValueOnce([
          {
            id: oracleRecords[0].id,
            type: CASE_RULES_SAVED_OBJECT,
            message: 'Not found',
            statusCode: 404,
            error: 'Not found',
          },
        ])
        .mockResolvedValueOnce([oracleRecords[0]])
        .mockResolvedValueOnce([{ ...oracleRecords[0], counter: 2 }]);

      mockBulkCreateRecords.mockResolvedValue([oracleRecords[0]]);

      mockGetCaseId
        .mockReturnValueOnce('mock-id-1')
        .mockReturnValueOnce('mock-id-2')
        .mockReturnValueOnce('mock-id-3');

      casesClientMock.cases.bulkGet
        .mockResolvedValueOnce({
          cases: [],
          errors: [
            {
              error: 'Not found',
              message: 'Not found',
              status: 404,
              caseId: cases[0].id,
            },
          ],
        })
        .mockResolvedValueOnce({
          cases: [cases[1]],
          errors: [],
        })
        .mockResolvedValueOnce({
          cases: [],
          errors: [
            {
              error: 'Not found',
              message: 'Not found',
              status: 404,
              caseId: cases[2].id,
            },
          ],
        });

      casesClientMock.cases.bulkCreate
        .mockResolvedValueOnce({ cases: [cases[0]] })
        .mockResolvedValueOnce({ cases: [cases[2]] });

      await connectorExecutor.execute(missingDataParams);
      await connectorExecutor.execute(missingDataParams);
      await connectorExecutor.execute(missingDataParams);

      expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(3);

      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
        caseId: 'mock-id-1',
        attachments: [
          {
            type: 'alert',
            alertId: ['test-id'],
            index: ['test-index'],
            rule: { id: 'rule-test-id', name: 'Test rule' },
            owner: 'securitySolution',
          },
        ],
      });

      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(2, {
        caseId: 'mock-id-2',
        attachments: [
          {
            type: 'alert',
            alertId: ['test-id'],
            index: ['test-index'],
            rule: { id: 'rule-test-id', name: 'Test rule' },
            owner: 'securitySolution',
          },
        ],
      });

      expect(casesClientMock.attachments.bulkCreate).nthCalledWith(3, {
        caseId: 'mock-id-3',
        attachments: [
          {
            type: 'alert',
            alertId: ['test-id'],
            index: ['test-index'],
            rule: { id: 'rule-test-id', name: 'Test rule' },
            owner: 'securitySolution',
          },
        ],
      });
    });

    it('increase oracle counter but is missing', async () => {
      const nonFoundRecord = {
        id: oracleRecords[0].id,
        type: CASE_RULES_SAVED_OBJECT,
        message: 'Not found',
        statusCode: 404,
        error: 'Not found',
      };

      dateMathMock.parse
        // time window has passed. should increase the counter
        .mockImplementationOnce(() => moment('2023-11-10T10:23:42.769Z'))
        // time window has not passed. counter should not be increased
        .mockImplementationOnce(() => moment('2023-10-09T10:23:42.769Z'));

      mockGetRecordId.mockReturnValue(oracleRecords[0].id);
      mockBulkGetRecords
        .mockResolvedValueOnce([oracleRecords[0]])
        .mockResolvedValueOnce([nonFoundRecord]);

      mockBulkCreateRecords.mockResolvedValueOnce(oracleRecords[0]);
      mockBulkUpdateRecord.mockResolvedValueOnce(nonFoundRecord);

      mockGetCaseId.mockReturnValueOnce('mock-id-1');

      casesClientMock.cases.bulkGet.mockResolvedValue({
        cases: [cases[0]],
        errors: [],
      });

      await connectorExecutor.execute(missingDataParams);
      await connectorExecutor.execute(missingDataParams);

      expect(mockBulkUpdateRecord).toBeCalledTimes(1);
      expect(mockBulkUpdateRecord).toHaveBeenCalledWith([
        { payload: { counter: 2 }, recordId: 'so-oracle-record-0', version: 'so-version-0' },
      ]);

      expect(mockBulkCreateRecords).toBeCalledTimes(1);
      expect(mockBulkCreateRecords).toHaveBeenCalledWith([
        {
          payload: {
            grouping: {
              foo: 'bar',
            },
            rules: [
              {
                id: 'rule-test-id',
              },
            ],
          },
          recordId: 'so-oracle-record-0',
        },
      ]);

      expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(1);
      expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledWith({
        caseId: 'mock-id-1',
        attachments: [
          {
            type: 'alert',
            alertId: ['test-id'],
            index: ['test-index'],
            rule: { id: 'rule-test-id', name: 'Test rule' },
            owner: 'securitySolution',
          },
        ],
      });
    });
  });
});
