/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import { registerConnectorTypes } from '../..';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { registrationServicesMock } from '../../../mocks';

const CONNECTOR_TYPE_ID = '.pagerduty';
let connectorTypeModel: ConnectorTypeModel;

beforeAll(() => {
  const connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
  const getResult = connectorTypeRegistry.get(CONNECTOR_TYPE_ID);
  if (getResult !== null) {
    connectorTypeModel = getResult;
  }
});

describe('connectorTypeRegistry.get() works', () => {
  test('connector type static data is as expected', () => {
    expect(connectorTypeModel.id).toEqual(CONNECTOR_TYPE_ID);
    expect(connectorTypeModel.actionTypeTitle).toEqual('Send to PagerDuty');
  });
});

describe('pagerduty action params validation', () => {
  test('action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      eventAction: 'trigger',
      dedupKey: 'test',
      summary: '2323',
      source: 'source',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      component: 'test',
      group: 'group',
      class: 'test class',
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        dedupKey: [],
        summary: [],
        timestamp: [],
      },
    });
  });

  test('action params validation fails when the timestamp is invalid', async () => {
    const actionParams = {
      eventAction: 'trigger',
      dedupKey: 'test',
      summary: '2323',
      source: 'source',
      severity: 'critical',
      timestamp: '2011-05-99T03:30-07',
      component: 'test',
      group: 'group',
      class: 'test class',
    };

    const expected = [expect.stringMatching(/^Timestamp must be a valid date/)];

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        dedupKey: [],
        summary: [],
        timestamp: expect.arrayContaining(expected),
      },
    });
  });
});
