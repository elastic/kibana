/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { CasesConnector } from './cases_connector';
import { CasesConnectorExecutor } from './cases_connector_executor';
import { CASES_CONNECTOR_ID } from './constants';
import { CasesOracleService } from './cases_oracle_service';
import { CasesService } from './cases_service';
import { CasesConnectorError } from './cases_connector_error';
import { CaseError } from '../../common/error';

jest.mock('./cases_connector_executor');

const CasesConnectorExecutorMock = CasesConnectorExecutor as jest.Mock;

describe('CasesConnector', () => {
  const services = actionsMock.createServices();

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

  const mockExecute = jest.fn();
  const getCasesClient = jest.fn().mockResolvedValue({ foo: 'bar' });

  let connector: CasesConnector;

  beforeEach(() => {
    jest.clearAllMocks();

    CasesConnectorExecutorMock.mockImplementation(() => {
      return {
        execute: mockExecute,
      };
    });

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

  it('calls creates the CasesConnectorExecutor correctly', async () => {
    await connector.run({
      alerts: [],
      groupingBy,
      owner,
      rule,
      timeWindow,
      reopenClosedCases,
    });

    expect(CasesConnectorExecutorMock).toBeCalledWith({
      casesClient: { foo: 'bar' },
      casesOracleService: expect.any(CasesOracleService),
      casesService: expect.any(CasesService),
    });
  });

  it('executes the CasesConnectorExecutor correctly', async () => {
    await connector.run({
      alerts: [],
      groupingBy,
      owner,
      rule,
      timeWindow,
      reopenClosedCases,
    });

    expect(mockExecute).toBeCalledWith({
      alerts: [],
      groupingBy,
      owner,
      rule,
      timeWindow,
      reopenClosedCases,
    });
  });

  it('creates the cases client correctly', async () => {
    await connector.run({
      alerts: [],
      groupingBy,
      owner,
      rule,
      timeWindow,
      reopenClosedCases,
    });

    expect(getCasesClient).toBeCalled();
  });

  it('throws the same error if the executor throws a CasesConnectorError error', async () => {
    mockExecute.mockRejectedValue(new CasesConnectorError('Bad request', 400));

    await expect(() =>
      connector.run({
        alerts: [],
        groupingBy,
        owner,
        rule,
        timeWindow,
        reopenClosedCases,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Bad request"`);
  });

  it('throws a CasesConnectorError when the executor throws an CaseError error', async () => {
    mockExecute.mockRejectedValue(new CaseError('Forbidden'));

    await expect(() =>
      connector.run({
        alerts: [],
        groupingBy,
        owner,
        rule,
        timeWindow,
        reopenClosedCases,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Forbidden"`);
  });

  it('throws a CasesConnectorError when the executor throws an Error', async () => {
    mockExecute.mockRejectedValue(new Error('Server error'));

    await expect(() =>
      connector.run({
        alerts: [],
        groupingBy,
        owner,
        rule,
        timeWindow,
        reopenClosedCases,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Server error"`);
  });
});
