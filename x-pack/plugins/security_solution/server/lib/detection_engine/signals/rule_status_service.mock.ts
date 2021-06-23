/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleStatusService } from './rule_status_service';

export const getRuleStatusServiceMock = (): jest.Mocked<RuleStatusService> => ({
  goingToRun: jest.fn(),
  success: jest.fn(),
  partialFailure: jest.fn(),
  error: jest.fn(),
});
