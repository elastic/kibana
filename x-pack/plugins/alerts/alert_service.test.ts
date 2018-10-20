/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertService } from './alert_service';

const mockServer = { start: jest.fn(), stop: jest.fn() };
const mockKbnServer = { server: mockServer };
const mockConfig = {};
const alertService = new AlertService(mockKbnServer, mockConfig);

test('condition gets registered and saved', async () => {
  alertService.registerCondition({
    name: 'Test Condition',
    runnable: (params: any) => {
      return false;
    },
  });
});
