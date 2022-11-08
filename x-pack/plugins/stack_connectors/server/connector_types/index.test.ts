/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerConnectorTypes } from '.';
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

const mockedActions = actionsMock.createSetup();

beforeEach(() => {
  jest.resetAllMocks();
});

describe('registers connectors', () => {
  test('calls registerType with expected connector types', () => {
    registerConnectorTypes({
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
