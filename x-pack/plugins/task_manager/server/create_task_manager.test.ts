/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTaskManager, LegacyDeps } from './create_task_manager';
import { mockLogger } from './test_utils';
import { CoreSetup, SavedObjectsSerializer, UuidServiceSetup } from '../../../../src/core/server';
import {
  savedObjectsRepositoryMock,
  savedObjectsTypeRegistryMock,
} from '../../../../src/core/server/mocks';

jest.mock('./task_manager');

describe('createTaskManager', () => {
  const uuid: UuidServiceSetup = {
    getInstanceUuid() {
      return 'some-uuid';
    },
  };
  const mockCoreSetup = {
    uuid,
  } as CoreSetup;

  const getMockLegacyDeps = (): LegacyDeps => ({
    config: {},
    savedObjectsSerializer: new SavedObjectsSerializer(savedObjectsTypeRegistryMock.create()),
    elasticsearch: {
      callAsInternalUser: jest.fn(),
    },
    savedObjectsRepository: savedObjectsRepositoryMock.create(),
    logger: mockLogger(),
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('exposes the underlying TaskManager', async () => {
    const mockLegacyDeps = getMockLegacyDeps();
    const setupResult = createTaskManager(mockCoreSetup, mockLegacyDeps);
    expect(setupResult).toMatchInlineSnapshot(`
      TaskManager {
        "addMiddleware": [MockFunction],
        "assertUninitialized": [MockFunction],
        "attemptToRun": [MockFunction],
        "ensureScheduled": [MockFunction],
        "fetch": [MockFunction],
        "get": [MockFunction],
        "registerTaskDefinitions": [MockFunction],
        "remove": [MockFunction],
        "runNow": [MockFunction],
        "schedule": [MockFunction],
        "start": [MockFunction],
        "stop": [MockFunction],
        "waitUntilStarted": [MockFunction],
      }
    `);
  });
});
