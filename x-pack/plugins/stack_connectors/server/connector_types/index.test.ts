/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerBuiltInConnectorTypes } from '.';
import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ActionTypeRegistry } from '@kbn/actions-plugin/server/action_type_registry';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';

const ACTION_TYPE_IDS = [
  '.index',
  '.email',
  '.pagerduty',
  '.server-log',
  '.slack',
  '.swimlane',
  '.teams',
  '.webhook',
  '.xmatters',
];

export function createConnectorTypeRegistry(): {
  logger: jest.Mocked<Logger>;
  actionTypeRegistry: ActionTypeRegistry;
} {
  const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
  registerBuiltInConnectorTypes({
    logger,
    actions: actionsMock.createSetup(),
  });
  return { logger, actionTypeRegistry };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('connector is registered', () => {
  test('gets registered with builtin connectors', () => {
    const { actionTypeRegistry } = createConnectorTypeRegistry();
    ACTION_TYPE_IDS.forEach((id) => expect(actionTypeRegistry.has(id)).toEqual(true));
  });
});
