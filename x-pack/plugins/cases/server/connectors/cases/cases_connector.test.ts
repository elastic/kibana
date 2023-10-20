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

jest.mock('./cases_oracle_service');

const CasesOracleServiceMock = CasesOracleService as jest.Mock;

describe('CasesConnector', () => {
  const services = actionsMock.createServices();

  const alerts = [
    { 'host.name': 'A', 'dest.ip': '0.0.0.1', 'source.ip': '0.0.0.2' },
    { 'host.name': 'B', 'dest.ip': '0.0.0.1', 'file.hash': '12345' },
    { 'host.name': 'A', 'dest.ip': '0.0.0.1' },
    { 'host.name': 'B', 'dest.ip': '0.0.0.3' },
    { 'host.name': 'A', 'source.ip': '0.0.0.5' },
  ];

  const groupingBy = ['host.name', 'dest.ip'];
  const rule = { id: 'rule-test-id', name: 'Test rule', tags: ['rule', 'test'] };
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

  const mockGetRecordId = jest.fn();
  const bulkGetRecords = jest.fn();
  const bulkCreateRecord = jest.fn();

  let connector: CasesConnector;

  beforeEach(() => {
    jest.clearAllMocks();

    CasesOracleServiceMock.mockImplementation(() => {
      let idCounter = 0;

      return {
        getRecordId: mockGetRecordId.mockImplementation(() => `so-oracle-record-${idCounter++}`),
        bulkGetRecords: bulkGetRecords.mockResolvedValue(oracleRecords),
        bulkCreateRecord: bulkCreateRecord.mockResolvedValue({
          ...oracleRecords[0],
          id: groupedAlertsWithOracleKey[2].oracleKey,
          grouping: groupedAlertsWithOracleKey[2].grouping,
          version: 'so-version-2',
        }),
      };
    });

    connector = new CasesConnector({
      configurationUtilities: actionsConfigMock.create(),
      config: {},
      secrets: {},
      connector: { id: '1', type: CASES_CONNECTOR_ID },
      logger: loggingSystemMock.createLogger(),
      services,
    });
  });

  describe('run', () => {
    describe('Oracle records', () => {
      it('generates the oracle keys correctly', async () => {
        await connector.run({ alerts, groupingBy, owner, rule });

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

        expect(bulkGetRecords).toHaveBeenCalledWith([
          groupedAlertsWithOracleKey[0].oracleKey,
          groupedAlertsWithOracleKey[1].oracleKey,
          groupedAlertsWithOracleKey[2].oracleKey,
        ]);
      });

      it('created the no found oracle records correctly', async () => {
        await connector.run({ alerts, groupingBy, owner, rule });

        expect(bulkCreateRecord).toHaveBeenCalledWith([
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
        bulkGetRecords.mockResolvedValue([oracleRecords[0]]);

        await connector.run({ alerts, groupingBy, owner, rule });

        expect(bulkCreateRecord).not.toHaveBeenCalled();
      });
    });
  });
});
