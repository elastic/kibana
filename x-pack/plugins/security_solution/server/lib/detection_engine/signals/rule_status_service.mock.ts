/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from '../../../../../../../src/core/server';
import { RuleStatusSavedObjectsClient } from './rule_status_saved_objects_client';
import { RuleStatusService } from './rule_status_service';

export type RuleStatusServiceMock = jest.Mocked<RuleStatusService>;

export const ruleStatusServiceFactoryMock = async ({
  alertId,
  ruleStatusClient,
}: {
  alertId: string;
  ruleStatusClient: RuleStatusSavedObjectsClient;
}): Promise<RuleStatusServiceMock> => {
  return {
    goingToRun: jest.fn(),

    success: jest.fn(),

    partialFailure: jest.fn(),

    error: jest.fn(),
  };
};

export type RuleStatusSavedObjectsClientMock = jest.Mocked<RuleStatusSavedObjectsClient>;

export const ruleStatusSavedObjectsClientFactory = (
  savedObjectsClient: SavedObjectsClientContract
): RuleStatusSavedObjectsClientMock => ({
  find: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});
