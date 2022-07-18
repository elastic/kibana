/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { registerActionsUsageCollector } from './actions_usage_collector';
import { configSchema, ActionsConfig } from '../config';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

const mockTaskManagerStart = taskManagerMock.createStart();

beforeEach(() => jest.resetAllMocks());

describe('registerActionsUsageCollector', () => {
  let config: ActionsConfig;
  let usageCollectionMock: jest.Mocked<UsageCollectionSetup>;
  beforeEach(() => {
    config = configSchema.validate({});
    usageCollectionMock = {
      makeUsageCollector: jest.fn(),
      registerCollector: jest.fn(),
    } as unknown as jest.Mocked<UsageCollectionSetup>;
  });

  it('should call registerCollector', () => {
    registerActionsUsageCollector(
      usageCollectionMock as UsageCollectionSetup,
      config,
      new Promise(() => mockTaskManagerStart)
    );
    expect(usageCollectionMock.registerCollector).toHaveBeenCalledTimes(1);
  });

  it('should call makeUsageCollector with type = actions', () => {
    registerActionsUsageCollector(
      usageCollectionMock as UsageCollectionSetup,
      config,
      new Promise(() => mockTaskManagerStart)
    );
    expect(usageCollectionMock.makeUsageCollector).toHaveBeenCalledTimes(1);
    expect(usageCollectionMock.makeUsageCollector.mock.calls[0][0].type).toBe('actions');
  });
});
