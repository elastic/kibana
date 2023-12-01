/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import moment from 'moment';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { CasesConnector } from './cases_connector';
import { CASES_CONNECTOR_ID } from './constants';
import { CASE_ORACLE_SAVED_OBJECT } from '../../../common/constants';
import { CasesOracleService } from './cases_oracle_service';
import { CasesService } from './cases_service';
import { createCasesClientMock } from '../../client/mocks';
import { mockCases } from '../../mocks';
import type { Cases } from '../../../common';
import { CaseStatuses } from '@kbn/cases-components';

jest.mock('./cases_oracle_service');
jest.mock('./cases_service');
jest.mock('@kbn/datemath');

const CasesOracleServiceMock = CasesOracleService as jest.Mock;
const CasesServiceMock = CasesService as jest.Mock;
const dateMathMock = dateMath as jest.Mocked<typeof dateMath>;

describe('CasesConnector', () => {
  const services = actionsMock.createServices();

  const alerts = [
    {
      _id: 'alert-id-0',
      _index: 'alert-index-0',
      'host.name': 'A',
      'dest.ip': '0.0.0.1',
      'source.ip': '0.0.0.2',
    },
    {
      _id: 'alert-id-1',
      _index: 'alert-index-1',
      'host.name': 'B',
      'dest.ip': '0.0.0.1',
      'file.hash': '12345',
    },
    { _id: 'alert-id-2', _index: 'alert-index-2', 'host.name': 'A', 'dest.ip': '0.0.0.1' },
    { _id: 'alert-id-3', _index: 'alert-index-3', 'host.name': 'B', 'dest.ip': '0.0.0.3' },
    { _id: 'alert-id-4', _index: 'alert-index-4', 'host.name': 'A', 'source.ip': '0.0.0.5' },
  ];

  const groupingBy = ['host.name', 'dest.ip'];
  const rule = {
    id: 'rule-test-id',
    name: 'Test rule',
    tags: ['rule', 'test'],
    ruleUrl: 'https://example.com/rules/rule-test-id',
  };

  const owner = 'cases';
  const timeWindow = '7d';
  const reopenClosedCases = false;

  const groupedAlertsWithOracleKey = [
    {
      alerts: [alerts[0], alerts[2]],
      grouping: { 'host.name': 'A', 'dest.ip': '0.0.0.1' },
      oracleKey: 'so-oracle-record-0',
    },
    {
      alerts: [alerts[1]],
      grouping: { 'host.name': 'B', 'dest.ip': '0.0.0.1' },
      oracleKey: 'so-oracle-record-1',
    },
    {
      alerts: [alerts[3]],
      grouping: { 'host.name': 'B', 'dest.ip': '0.0.0.3' },
      oracleKey: 'so-oracle-record-2',
    },
  ];

  const oracleRecords = [
    {
      id: groupedAlertsWithOracleKey[0].oracleKey,
      version: 'so-version-0',
      counter: 1,
      cases: [],
      rules: [],
      grouping: groupedAlertsWithOracleKey[0].grouping,
      createdAt: '2023-10-10T10:23:42.769Z',
      updatedAt: '2023-10-10T10:23:42.769Z',
    },
    {
      id: groupedAlertsWithOracleKey[1].oracleKey,
      version: 'so-version-1',
      counter: 1,
      cases: [],
      rules: [],
      grouping: groupedAlertsWithOracleKey[1].grouping,
      createdAt: '2023-10-12T10:23:42.769Z',
      updatedAt: '2023-10-12T10:23:42.769Z',
    },
    {
      id: groupedAlertsWithOracleKey[2].oracleKey,
      type: CASE_ORACLE_SAVED_OBJECT,
      message: 'Not found',
      statusCode: 404,
      error: 'Not found',
    },
  ];

  const cases: Cases = mockCases.map((so) => ({
    ...so.attributes,
    id: so.id,
    version: so.version ?? '',
    totalComment: 0,
    totalAlerts: 0,
  }));

  const mockGetRecordId = jest.fn();
  const mockBulkGetRecords = jest.fn();
  const mockBulkCreateRecord = jest.fn();
  const mockBulkUpdateRecord = jest.fn();
  const mockGetCaseId = jest.fn();

  const getCasesClient = jest.fn();
  const casesClientMock = createCasesClientMock();

  let connector: CasesConnector;

  describe('With grouping', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      CasesOracleServiceMock.mockImplementation(() => {
        let oracleIdCounter = 0;

        return {
          getRecordId: mockGetRecordId.mockImplementation(
            () => `so-oracle-record-${oracleIdCounter++}`
          ),
          bulkGetRecords: mockBulkGetRecords.mockResolvedValue(oracleRecords),
          bulkCreateRecord: mockBulkCreateRecord.mockResolvedValue([
            {
              ...oracleRecords[0],
              id: groupedAlertsWithOracleKey[2].oracleKey,
              grouping: groupedAlertsWithOracleKey[2].grouping,
              version: 'so-version-2',
            },
          ]),
          bulkUpdateRecord: mockBulkUpdateRecord.mockResolvedValue([]),
        };
      });

      CasesServiceMock.mockImplementation(() => {
        let caseIdCounter = 0;

        return {
          getCaseId: mockGetCaseId.mockImplementation(() => `mock-id-${++caseIdCounter}`),
        };
      });

      casesClientMock.cases.bulkGet.mockResolvedValue({ cases, errors: [] });
      casesClientMock.cases.bulkCreate.mockResolvedValue({ cases: [] });

      getCasesClient.mockReturnValue(casesClientMock);

      connector = new CasesConnector({
        casesParams: { getCasesClient },
        connectorParams: {
          configurationUtilities: actionsConfigMock.create(),
          config: {},
          secrets: {},
          connector: { id: '1', type: CASES_CONNECTOR_ID },
          logger: loggingSystemMock.createLogger(),
          services,
        },
      });

      dateMathMock.parse.mockImplementation(() => moment('2023-10-09T10:23:42.769Z'));
    });

    describe('run', () => {
      describe('Oracle records', () => {
        it('generates the oracle keys correctly with grouping by one field', async () => {
          await connector.run({
            alerts,
            groupingBy: ['host.name'],
            owner,
            rule,
            timeWindow,
            reopenClosedCases,
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
          await connector.run({ alerts, groupingBy, owner, rule, timeWindow, reopenClosedCases });

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
          await connector.run({ alerts, groupingBy, owner, rule, timeWindow, reopenClosedCases });

          expect(mockBulkGetRecords).toHaveBeenCalledWith([
            groupedAlertsWithOracleKey[0].oracleKey,
            groupedAlertsWithOracleKey[1].oracleKey,
            groupedAlertsWithOracleKey[2].oracleKey,
          ]);
        });

        it('created the non found oracle records correctly', async () => {
          await connector.run({ alerts, groupingBy, owner, rule, timeWindow, reopenClosedCases });

          expect(mockBulkCreateRecord).toHaveBeenCalledWith([
            {
              recordId: groupedAlertsWithOracleKey[2].oracleKey,
              payload: {
                cases: [],
                grouping: groupedAlertsWithOracleKey[2].grouping,
                rules: [],
              },
            },
          ]);
        });

        it('does not create oracle records if there are no 404 errors', async () => {
          mockBulkGetRecords.mockResolvedValue([oracleRecords[0]]);

          await connector.run({ alerts, groupingBy, owner, rule, timeWindow, reopenClosedCases });

          expect(mockBulkCreateRecord).not.toHaveBeenCalled();
        });

        it('does not create oracle records if there are other errors than 404', async () => {
          mockBulkGetRecords.mockResolvedValue([
            {
              id: groupedAlertsWithOracleKey[2].oracleKey,
              type: CASE_ORACLE_SAVED_OBJECT,
              message: 'Conflict',
              statusCode: 409,
              error: 'Conflict',
            },
          ]);

          await connector.run({ alerts, groupingBy, owner, rule, timeWindow, reopenClosedCases });

          /**
           * TODO: Change it to: expect(mockBulkCreateRecord).not.toHaveBeenCalled();
           */
          expect(mockBulkCreateRecord).toHaveBeenCalledWith([]);
        });

        it('does not increase the counter if the time window has not passed', async () => {
          mockBulkGetRecords.mockResolvedValue([oracleRecords[0]]);
          await connector.run({ alerts, groupingBy, owner, rule, timeWindow, reopenClosedCases });

          expect(mockBulkUpdateRecord).not.toHaveBeenCalled();
        });

        it('updates the counter correctly if the time window has passed', async () => {
          dateMathMock.parse.mockImplementation(() => moment('2023-11-10T10:23:42.769Z'));
          await connector.run({ alerts, groupingBy, owner, rule, timeWindow, reopenClosedCases });

          expect(mockBulkUpdateRecord).toHaveBeenCalledWith([
            { payload: { counter: 2 }, recordId: 'so-oracle-record-0', version: 'so-version-0' },
            { payload: { counter: 2 }, recordId: 'so-oracle-record-1', version: 'so-version-1' },
          ]);
        });

        it('run correctly with all records: valid, counter increased, counter did not increased, created', async () => {
          dateMathMock.parse.mockImplementation(() => moment('2023-10-11T10:23:42.769Z'));
          mockBulkCreateRecord.mockResolvedValue([
            {
              ...oracleRecords[0],
              id: groupedAlertsWithOracleKey[2].oracleKey,
              grouping: groupedAlertsWithOracleKey[2].grouping,
              version: 'so-version-2',
            },
            // Returning errors to verify that the code does not return them
            {
              id: 'test-id',
              type: CASE_ORACLE_SAVED_OBJECT,
              message: 'Conflict',
              statusCode: 409,
              error: 'Conflict',
            },
          ]);

          mockBulkUpdateRecord.mockResolvedValue([
            { ...oracleRecords[0], counter: 2 },
            // Returning errors to verify that the code does not return them
            {
              id: 'test-id',
              type: CASE_ORACLE_SAVED_OBJECT,
              message: 'Conflict',
              statusCode: 409,
              error: 'Conflict',
            },
          ]);

          await connector.run({ alerts, groupingBy, owner, rule, timeWindow, reopenClosedCases });

          // 1. Get all records
          expect(mockBulkGetRecords).toHaveBeenCalledWith([
            groupedAlertsWithOracleKey[0].oracleKey,
            groupedAlertsWithOracleKey[1].oracleKey,
            groupedAlertsWithOracleKey[2].oracleKey,
          ]);

          // 2. Create the non found records
          expect(mockBulkCreateRecord).toHaveBeenCalledWith([
            {
              recordId: groupedAlertsWithOracleKey[2].oracleKey,
              payload: {
                cases: [],
                grouping: groupedAlertsWithOracleKey[2].grouping,
                rules: [],
              },
            },
          ]);

          // 3. Update the counter for the records where the time window has passed
          expect(mockBulkUpdateRecord).toHaveBeenCalledWith([
            { payload: { counter: 2 }, recordId: 'so-oracle-record-0', version: 'so-version-0' },
          ]);
        });
      });

      describe('Cases', () => {
        it('generates the case ids correctly', async () => {
          await connector.run({ alerts, groupingBy, owner, rule, timeWindow, reopenClosedCases });

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

          await connector.run({ alerts, groupingBy, owner, rule, timeWindow, reopenClosedCases });

          expect(mockGetCaseId).toBeCalledTimes(3);

          /**
           * Oracle record index: 1
           * Should not update the counter
           */
          expect(mockGetCaseId).nthCalledWith(1, {
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
          expect(mockGetCaseId).nthCalledWith(2, {
            counter: 1,
            grouping: { 'dest.ip': '0.0.0.3', 'host.name': 'B' },
            owner: 'cases',
            ruleId: 'rule-test-id',
            spaceId: 'default',
          });

          /**
           * Oracle record index: 0
           * Should update the counter
           */
          expect(mockGetCaseId).nthCalledWith(3, {
            counter: 2,
            grouping: { 'dest.ip': '0.0.0.1', 'host.name': 'A' },
            owner: 'cases',
            ruleId: 'rule-test-id',
            spaceId: 'default',
          });
        });

        it('gets the cases correctly', async () => {
          await connector.run({ alerts, groupingBy, owner, rule, timeWindow, reopenClosedCases });

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
              {
                error: 'Forbidden',
                message: 'Unauthorized to access case',
                status: 403,
                caseId: 'mock-id-3',
              },
            ],
          });

          await connector.run({ alerts, groupingBy, owner, rule, timeWindow, reopenClosedCases });

          expect(casesClientMock.cases.bulkCreate).toHaveBeenCalledWith({
            cases: [
              {
                title: 'Test rule (Auto-created)',
                description:
                  'This case is auto-created by [Test rule](https://example.com/rules/rule-test-id). \n\n Grouping: `host.name` equals `B` and `dest.ip` equals `0.0.0.3`',
                owner: 'cases',
                settings: {
                  syncAlerts: false,
                },
                tags: ['auto-generated', ...rule.tags],
                connector: {
                  fields: null,
                  id: 'none',
                  name: 'none',
                  type: '.none',
                },
              },
            ],
          });
        });

        it('does not create when there are no 404 errors', async () => {
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [cases[0], cases[1]],
            errors: [
              {
                error: 'Forbidden',
                message: 'Unauthorized to access case',
                status: 403,
                caseId: 'mock-id-3',
              },
            ],
          });

          await connector.run({ alerts, groupingBy, owner, rule, timeWindow, reopenClosedCases });

          expect(casesClientMock.cases.bulkCreate).not.toHaveBeenCalled();
        });

        it('does not reopen closed cases if reopenClosedCases=false', async () => {
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [{ ...cases[0], status: CaseStatuses.closed }],
            errors: [],
          });

          await connector.run({
            alerts,
            groupingBy,
            owner,
            rule,
            timeWindow,
            reopenClosedCases: false,
          });

          expect(casesClientMock.cases.bulkUpdate).not.toHaveBeenCalled();
        });

        it('reopen closed cases if reopenClosedCases=true', async () => {
          casesClientMock.cases.bulkGet.mockResolvedValue({
            cases: [{ ...cases[0], status: CaseStatuses.closed }],
            errors: [],
          });

          await connector.run({
            alerts,
            groupingBy,
            owner,
            rule,
            timeWindow,
            reopenClosedCases: true,
          });

          expect(casesClientMock.cases.bulkUpdate).toHaveBeenCalledWith({
            cases: [{ id: cases[0].id, status: 'open', version: cases[0].version }],
          });
        });
      });

      describe('Alerts', () => {
        it('attach the alerts to the correct cases correctly', async () => {
          await connector.run({ alerts, groupingBy, owner, rule, timeWindow, reopenClosedCases });

          expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(3);

          expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
            caseId: 'mock-id-1',
            attachments: [
              {
                alertId: 'alert-id-0',
                index: 'alert-index-0',
                owner: 'securitySolution',
                rule: {
                  id: 'rule-test-id',
                  name: 'Test rule',
                },
                type: 'alert',
              },
              {
                alertId: 'alert-id-2',
                index: 'alert-index-2',
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
                alertId: 'alert-id-1',
                index: 'alert-index-1',
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
                alertId: 'alert-id-3',
                index: 'alert-index-3',
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
  });

  /**
   * In this testing group we test
   * only the functionality that differs
   * from the testing with grouping
   */
  describe('Without grouping', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      CasesOracleServiceMock.mockImplementation(() => {
        let oracleIdCounter = 0;

        return {
          getRecordId: mockGetRecordId.mockImplementation(
            () => `so-oracle-record-${oracleIdCounter++}`
          ),
          bulkGetRecords: mockBulkGetRecords.mockResolvedValue([oracleRecords[0]]),
          bulkCreateRecord: mockBulkCreateRecord.mockResolvedValue([]),
        };
      });

      CasesServiceMock.mockImplementation(() => {
        let caseIdCounter = 0;

        return {
          getCaseId: mockGetCaseId.mockImplementation(() => `mock-id-${++caseIdCounter}`),
        };
      });

      casesClientMock.cases.bulkGet.mockResolvedValue({ cases: [cases[0]], errors: [] });

      getCasesClient.mockReturnValue(casesClientMock);

      connector = new CasesConnector({
        casesParams: { getCasesClient },
        connectorParams: {
          configurationUtilities: actionsConfigMock.create(),
          config: {},
          secrets: {},
          connector: { id: '1', type: CASES_CONNECTOR_ID },
          logger: loggingSystemMock.createLogger(),
          services,
        },
      });
    });

    describe('Oracle records', () => {
      it('generates the oracle keys correctly with no grouping', async () => {
        await connector.run({ alerts, groupingBy: [], owner, rule, timeWindow, reopenClosedCases });

        expect(mockGetRecordId).toHaveBeenCalledTimes(1);

        expect(mockGetRecordId).nthCalledWith(1, {
          ruleId: rule.id,
          grouping: {},
          owner,
          spaceId: 'default',
        });
      });

      it('gets the oracle records correctly', async () => {
        await connector.run({ alerts, groupingBy: [], owner, rule, timeWindow, reopenClosedCases });

        expect(mockBulkGetRecords).toHaveBeenCalledWith(['so-oracle-record-0']);
      });
    });

    describe('Cases', () => {
      it('generates the case ids correctly', async () => {
        await connector.run({ alerts, groupingBy: [], owner, rule, timeWindow, reopenClosedCases });

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
        await connector.run({ alerts, groupingBy: [], owner, rule, timeWindow, reopenClosedCases });

        expect(casesClientMock.cases.bulkGet).toHaveBeenCalledWith({
          ids: ['mock-id-1'],
        });
      });
    });

    describe('Alerts', () => {
      it('attach all alerts to the same case when the grouping is not defined', async () => {
        await connector.run({ alerts, groupingBy: [], owner, rule, timeWindow, reopenClosedCases });
        expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(1);

        expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
          caseId: 'mock-id-1',
          attachments: alerts.map((alert) => ({
            alertId: alert._id,
            index: alert._index,
            owner: 'securitySolution',
            rule: {
              id: 'rule-test-id',
              name: 'Test rule',
            },
            type: 'alert',
          })),
        });
      });
    });
  });
});
