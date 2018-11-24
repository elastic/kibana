/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertService } from './alert_service';

describe('Alerting Service', () => {
  const mockTaskManager = { registerTaskDefinitions: jest.fn() };
  const mockServer = {
    start: jest.fn(),
    stop: jest.fn(),
    route: jest.fn(),
    taskManager: mockTaskManager,
  };
  const mockKbnServer = { server: mockServer, afterPluginsInit: jest.fn() };
  const alertService = new AlertService(mockKbnServer);
  expect(mockTaskManager.registerTaskDefinitions.mock.calls.length).toBe(0);

  it('should forward registration on to task manager', () => {
    const testType = 'my-test-template';
    alertService.registerAlertTemplate({
      id: testType,
      check: () => ({}),
      notify: () => ({}),
    });
    expect(mockTaskManager.registerTaskDefinitions.mock.calls.length).toBe(1);
    expect(mockTaskManager.registerTaskDefinitions.mock.calls[0][0][testType].type).toEqual(
      testType
    );
  });

  it('should have a register function', () => {
    expect(typeof alertService.registerAlertTemplate).toEqual('function');
  });
});
