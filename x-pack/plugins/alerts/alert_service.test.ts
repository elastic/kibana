/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertService } from './alert_service';

const mockTaskManager = { registerTaskDefinitions: jest.fn() };
const mockServer = {
  start: jest.fn(),
  stop: jest.fn(),
  route: jest.fn(),
  taskManager: mockTaskManager,
};
const mockKbnServer = { server: mockServer, afterPluginsInit: jest.fn() };
const alertService = new AlertService(mockKbnServer);

test('condition gets registered and saved', async () => {
  alertService.registerCondition({
    name: 'Test Condition',
    runnable: () => {
      return false;
    },
  });
});
