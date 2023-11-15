/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

jest.mock('./cases_oracle_service');
jest.mock('./cases_service');

const CasesOracleServiceMock = CasesOracleService as jest.Mock;
const CasesServiceMock = CasesService as jest.Mock;

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
      createdAt: '2023-10-10T10:23:42.769Z',
      updatedAt: '2023-10-10T10:23:42.769Z',
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
    });

    describe('run', () => {
      describe('Oracle records', () => {
        it('generates the oracle keys correctly with grouping by one field', async () => {
          await connector.run({ alerts, groupingBy: ['host.name'], owner, rule });

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
          await connector.run({ alerts, groupingBy, owner, rule });

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
          await connector.run({ alerts, groupingBy, owner, rule });

          expect(mockBulkGetRecords).toHaveBeenCalledWith([
            groupedAlertsWithOracleKey[0].oracleKey,
            groupedAlertsWithOracleKey[1].oracleKey,
            groupedAlertsWithOracleKey[2].oracleKey,
          ]);
        });

        it('created the non found oracle records correctly', async () => {
          await connector.run({ alerts, groupingBy, owner, rule });

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

          await connector.run({ alerts, groupingBy, owner, rule });

          expect(mockBulkCreateRecord).not.toHaveBeenCalled();
        });
      });

      describe('Cases', () => {
        it('generates the case ids correctly', async () => {
          await connector.run({ alerts, groupingBy, owner, rule });

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

        it('gets the cases correctly', async () => {
          await connector.run({ alerts, groupingBy, owner, rule });

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

          await connector.run({ alerts, groupingBy, owner, rule });

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

          await connector.run({ alerts, groupingBy, owner, rule });

          expect(casesClientMock.cases.bulkCreate).not.toHaveBeenCalled();
        });
      });

      describe('Alerts', () => {
        it('attach the alerts to the correct cases correctly', async () => {
          await connector.run({ alerts, groupingBy, owner, rule });

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
        await connector.run({ alerts, groupingBy: [], owner, rule });

        expect(mockGetRecordId).toHaveBeenCalledTimes(1);

        expect(mockGetRecordId).nthCalledWith(1, {
          ruleId: rule.id,
          grouping: {},
          owner,
          spaceId: 'default',
        });
      });

      it('gets the oracle records correctly', async () => {
        await connector.run({ alerts, groupingBy: [], owner, rule });

        expect(mockBulkGetRecords).toHaveBeenCalledWith(['so-oracle-record-0']);
      });
    });

    describe('Cases', () => {
      it('generates the case ids correctly', async () => {
        await connector.run({ alerts, groupingBy: [], owner, rule });

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
        await connector.run({ alerts, groupingBy: [], owner, rule });

        expect(casesClientMock.cases.bulkGet).toHaveBeenCalledWith({
          ids: ['mock-id-1'],
        });
      });
    });

    describe('Alerts', () => {
      it('attach all alerts to the same case when the grouping is not defined', async () => {
        await connector.run({ alerts, groupingBy: [], owner, rule });
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
