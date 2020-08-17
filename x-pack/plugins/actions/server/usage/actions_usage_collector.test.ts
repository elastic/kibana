/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { registerActionsUsageCollector } from './actions_usage_collector';
import { taskManagerMock } from '../../../task_manager/server/task_manager.mock';

const mockTaskManagerStart = taskManagerMock.start();

beforeEach(() => jest.resetAllMocks());

describe('registerActionsUsageCollector', () => {
  let usageCollectionMock: jest.Mocked<UsageCollectionSetup>;
  beforeEach(() => {
    usageCollectionMock = ({
      makeUsageCollector: jest.fn(),
      registerCollector: jest.fn(),
    } as unknown) as jest.Mocked<UsageCollectionSetup>;
  });

  it('should call registerCollector', () => {
    registerActionsUsageCollector(
      usageCollectionMock as UsageCollectionSetup,
      mockTaskManagerStart
    );
    expect(usageCollectionMock.registerCollector).toHaveBeenCalledTimes(1);
  });

  it('should call makeUsageCollector with type = actions', () => {
    registerActionsUsageCollector(
      usageCollectionMock as UsageCollectionSetup,
      mockTaskManagerStart
    );
    expect(usageCollectionMock.makeUsageCollector).toHaveBeenCalledTimes(1);
    expect(usageCollectionMock.makeUsageCollector.mock.calls[0][0].type).toBe('actions');
  });
});
