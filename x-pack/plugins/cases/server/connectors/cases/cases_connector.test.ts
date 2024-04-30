/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { CasesConnector } from './cases_connector';
import { CasesConnectorExecutor } from './cases_connector_executor';
import { CASES_CONNECTOR_ID } from '../../../common/constants';
import { CasesOracleService } from './cases_oracle_service';
import { CasesService } from './cases_service';
import { CasesConnectorError } from './cases_connector_error';
import { CaseError } from '../../common/error';
import { fullJitterBackoffFactory } from './full_jitter_backoff';
import { CoreKibanaRequest } from '@kbn/core/server';

jest.mock('./cases_connector_executor');
jest.mock('./full_jitter_backoff');

const CasesConnectorExecutorMock = CasesConnectorExecutor as jest.Mock;
const fullJitterBackoffFactoryMock = fullJitterBackoffFactory as jest.Mock;

describe('CasesConnector', () => {
  const services = actionsMock.createServices();
  const logger = loggingSystemMock.createLogger();
  const kibanaRequest = CoreKibanaRequest.from({ path: '/', headers: {} });

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
  const maximumCasesToOpen = 5;

  const mockExecute = jest.fn();
  const getCasesClient = jest.fn().mockResolvedValue({ foo: 'bar' });
  const getSpaceId = jest.fn().mockReturnValue('default');
  const getUnsecuredSavedObjectsClient = jest.fn();
  // 1ms delay before retrying
  const nextBackOff = jest.fn().mockReturnValue(1);

  const backOffFactory = {
    create: () => ({ nextBackOff }),
  };

  const casesParams = { getCasesClient, getSpaceId, getUnsecuredSavedObjectsClient };
  const connectorParams = {
    configurationUtilities: actionsConfigMock.create(),
    config: {},
    secrets: {},
    connector: { id: '1', type: CASES_CONNECTOR_ID },
    logger,
    services,
    request: kibanaRequest,
  };

  let connector: CasesConnector;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecute.mockResolvedValue({});

    CasesConnectorExecutorMock.mockImplementation(() => {
      return {
        execute: mockExecute,
      };
    });

    fullJitterBackoffFactoryMock.mockReturnValue(backOffFactory);

    connector = new CasesConnector({
      casesParams,
      connectorParams,
    });
  });

  it('creates the CasesConnectorExecutor correctly', async () => {
    await connector.run({
      alerts: [{ _id: 'alert-id-0', _index: 'alert-index-0' }],
      groupingBy,
      owner,
      rule,
      timeWindow,
      reopenClosedCases,
      maximumCasesToOpen,
    });

    expect(CasesConnectorExecutorMock).toBeCalledWith({
      logger,
      casesClient: { foo: 'bar' },
      casesOracleService: expect.any(CasesOracleService),
      casesService: expect.any(CasesService),
      spaceId: 'default',
    });
  });

  it('executes the CasesConnectorExecutor correctly', async () => {
    await connector.run({
      alerts: [{ _id: 'alert-id-0', _index: 'alert-index-0' }],
      groupingBy,
      owner,
      rule,
      timeWindow,
      reopenClosedCases,
      maximumCasesToOpen,
    });

    expect(mockExecute).toBeCalledWith({
      alerts: [{ _id: 'alert-id-0', _index: 'alert-index-0' }],
      groupingBy,
      owner,
      rule,
      timeWindow,
      reopenClosedCases,
      maximumCasesToOpen,
    });
  });

  it('creates the cases client correctly', async () => {
    await connector.run({
      alerts: [{ _id: 'alert-id-0', _index: 'alert-index-0' }],
      groupingBy,
      owner,
      rule,
      timeWindow,
      reopenClosedCases,
      maximumCasesToOpen,
    });

    expect(getCasesClient).toBeCalled();
  });

  it('throws the same error if the executor throws a CasesConnectorError error', async () => {
    mockExecute.mockRejectedValue(new CasesConnectorError('Bad request', 400));

    await expect(() =>
      connector.run({
        alerts: [{ _id: 'alert-id-0', _index: 'alert-index-0' }],
        groupingBy,
        owner,
        rule,
        timeWindow,
        reopenClosedCases,
        maximumCasesToOpen,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Bad request"`);

    expect(logger.error.mock.calls[0][0]).toBe(
      '[CasesConnector][run] Execution of case connector failed. Message: Bad request. Status code: 400'
    );
  });

  it('throws a CasesConnectorError when the executor throws an CaseError error', async () => {
    mockExecute.mockRejectedValue(new CaseError('Forbidden'));

    await expect(() =>
      connector.run({
        alerts: [{ _id: 'alert-id-0', _index: 'alert-index-0' }],
        groupingBy,
        owner,
        rule,
        timeWindow,
        reopenClosedCases,
        maximumCasesToOpen,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Forbidden"`);

    expect(logger.error.mock.calls[0][0]).toBe(
      '[CasesConnector][run] Execution of case connector failed. Message: Forbidden. Status code: 500'
    );
  });

  it('throws a CasesConnectorError when the executor throws an Error', async () => {
    mockExecute.mockRejectedValue(new Error('Server error'));

    await expect(() =>
      connector.run({
        alerts: [{ _id: 'alert-id-0', _index: 'alert-index-0' }],
        groupingBy,
        owner,
        rule,
        timeWindow,
        reopenClosedCases,
        maximumCasesToOpen,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Server error"`);

    expect(logger.error.mock.calls[0][0]).toBe(
      '[CasesConnector][run] Execution of case connector failed. Message: Server error. Status code: 500'
    );
  });

  it('throws a CasesConnectorError when the executor throws a Boom error', async () => {
    mockExecute.mockRejectedValue(
      new Boom.Boom('Server error', { statusCode: 403, message: 'my error message' })
    );

    await expect(() =>
      connector.run({
        alerts: [{ _id: 'alert-id-0', _index: 'alert-index-0' }],
        groupingBy,
        owner,
        rule,
        timeWindow,
        reopenClosedCases,
        maximumCasesToOpen,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Forbidden: Server error"`);

    expect(logger.error.mock.calls[0][0]).toBe(
      '[CasesConnector][run] Execution of case connector failed. Message: Forbidden: Server error. Status code: 403'
    );
  });

  it('retries correctly', async () => {
    mockExecute
      .mockRejectedValueOnce(new CasesConnectorError('Conflict error', 409))
      .mockRejectedValueOnce(new CasesConnectorError('ES Unavailable', 503))
      .mockResolvedValue({});

    await connector.run({
      alerts: [{ _id: 'alert-id-0', _index: 'alert-index-0' }],
      groupingBy,
      owner,
      rule,
      timeWindow,
      reopenClosedCases,
      maximumCasesToOpen,
    });

    expect(nextBackOff).toBeCalledTimes(2);
    expect(mockExecute).toBeCalledTimes(3);
  });

  it('throws if the kibana request is not defined', async () => {
    connector = new CasesConnector({
      casesParams,
      connectorParams: { ...connectorParams, request: undefined },
    });

    await expect(() =>
      connector.run({
        alerts: [{ _id: 'alert-id-0', _index: 'alert-index-0' }],
        groupingBy,
        owner,
        rule,
        timeWindow,
        reopenClosedCases,
        maximumCasesToOpen,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Kibana request is not defined"`);

    expect(logger.error.mock.calls[0][0]).toBe(
      '[CasesConnector][run] Execution of case connector failed. Message: Kibana request is not defined. Status code: 400'
    );

    expect(nextBackOff).toBeCalledTimes(0);
    expect(mockExecute).toBeCalledTimes(0);
  });

  it('does not execute with no alerts', async () => {
    await connector.run({
      alerts: [],
      groupingBy,
      owner,
      rule,
      timeWindow,
      reopenClosedCases,
      maximumCasesToOpen,
    });

    expect(getCasesClient).not.toBeCalled();
    expect(CasesConnectorExecutorMock).not.toBeCalled();
    expect(mockExecute).not.toBeCalled();
    expect(nextBackOff).not.toBeCalled();
  });
});
