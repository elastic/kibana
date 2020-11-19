/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { registerActionsUsageCollector } from './actions_usage_collector';
import { taskManagerMock } from '../../../task_manager/server/mocks';
import { coreMock } from 'src/core/server/mocks';

const mockTaskManagerStart = taskManagerMock.createStart();
const core = coreMock.createSetup();

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
      core.getStartServices().then(([_, {}]) => mockTaskManagerStart)
    );
    expect(usageCollectionMock.registerCollector).toHaveBeenCalledTimes(1);
  });

  it('should call makeUsageCollector with type = actions', () => {
    registerActionsUsageCollector(
      usageCollectionMock as UsageCollectionSetup,
      core.getStartServices().then(([_, {}]) => mockTaskManagerStart)
    );
    expect(usageCollectionMock.makeUsageCollector).toHaveBeenCalledTimes(1);
    expect(usageCollectionMock.makeUsageCollector.mock.calls[0][0].type).toBe('actions');
  });
});
