/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerConnectorTypes } from '.';
import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
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
  '.torq',
];

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const mockedActions = actionsMock.createSetup();

beforeEach(() => {
  jest.resetAllMocks();
});

describe('registers connectors', () => {
  test('calls registerType with expected connector types', () => {
    registerConnectorTypes({
      logger,
      actions: mockedActions,
    });
    ACTION_TYPE_IDS.forEach((id) =>
      expect(mockedActions.registerType).toHaveBeenCalledWith(
        expect.objectContaining({
          id,
        })
      )
    );
  });
});
