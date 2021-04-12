/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleStatusSavedObjectsClient } from '../rule_status_saved_objects_client';

const createMockRuleStatusSavedObjectsClient = (): jest.Mocked<RuleStatusSavedObjectsClient> => ({
  find: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

export const ruleStatusSavedObjectsClientMock = {
  create: createMockRuleStatusSavedObjectsClient,
};
