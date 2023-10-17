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

describe('CasesConnector', () => {
  let connector: CasesConnector;
  const alerts = [
    { 'host.name': 'A', 'dest.ip': '0.0.0.1', 'source.ip': '0.0.0.2' },
    { 'host.name': 'B', 'dest.ip': '0.0.0.1', 'file.hash': '12345' },
    { 'host.name': 'A', 'dest.ip': '0.0.0.1' },
    { 'host.name': 'B', 'dest.ip': '0.0.0.3' },
    { 'host.name': 'A', 'source.ip': '0.0.0.5' },
  ];

  const groupingBy = ['host.name', 'dest.ip'];
  const rule = { id: 'rule-test-id', name: 'Test rule', tags: ['rule', 'test'] };

  beforeEach(() => {
    jest.resetAllMocks();
    connector = new CasesConnector({
      configurationUtilities: actionsConfigMock.create(),
      config: {},
      secrets: {},
      connector: { id: '1', type: CASES_CONNECTOR_ID },
      logger: loggingSystemMock.createLogger(),
      services: actionsMock.createServices(),
    });
  });

  describe('run', () => {
    describe('alerts grouping', () => {
      it('groups the alerts correctly', async () => {
        connector.run({ alerts, groupingBy, owner: 'cases', rule });
      });
    });
  });
});
