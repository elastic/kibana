/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { createDefaultSpace } from './create_default_space';
import { SavedObjectsLegacyService, IClusterClient } from 'src/core/server';

interface MockServerSettings {
  defaultExists?: boolean;
  simulateGetErrorCondition?: boolean;
  simulateCreateErrorCondition?: boolean;
  simulateConflict?: boolean;
  [invalidKeys: string]: any;
}
const createMockDeps = (settings: MockServerSettings = {}) => {
  const {
    defaultExists = false,
    simulateGetErrorCondition = false,
    simulateConflict = false,
    simulateCreateErrorCondition = false,
  } = settings;

  const mockGet = jest.fn().mockImplementation(() => {
    if (simulateGetErrorCondition) {
      throw new Error('unit test: unexpected exception condition');
    }

    if (defaultExists) {
      return;
    }
    throw Boom.notFound('unit test: default space not found');
  });

  const mockCreate = jest.fn().mockImplementation(() => {
    if (simulateConflict) {
      throw new Error('unit test: default space already exists');
    }
    if (simulateCreateErrorCondition) {
      throw new Error('unit test: some other unexpected error');
    }

    return null;
  });

  const mockServer = {
    config: jest.fn().mockReturnValue({
      get: jest.fn(),
    }),
    savedObjects: {
      SavedObjectsClient: {
        errors: {
          isNotFoundError: (e: Error) => e.message === 'unit test: default space not found',
          isConflictError: (e: Error) => e.message === 'unit test: default space already exists',
        },
      },
      getSavedObjectsRepository: jest.fn().mockImplementation(() => {
        return {
          get: mockGet,
          create: mockCreate,
        };
      }),
    },
  };

  mockServer.config().get.mockImplementation((key: string) => {
    return settings[key];
  });

  return {
    config: mockServer.config(),
    savedObjects: (mockServer.savedObjects as unknown) as SavedObjectsLegacyService,
    esClient: ({
      callAsInternalUser: jest.fn(),
    } as unknown) as jest.Mocked<IClusterClient>,
  };
};

test(`it creates the default space when one does not exist`, async () => {
  const deps = createMockDeps({
    defaultExists: false,
  });

  await createDefaultSpace(deps);

  const repository = deps.savedObjects.getSavedObjectsRepository();

  expect(repository.get).toHaveBeenCalledTimes(1);
  expect(repository.create).toHaveBeenCalledTimes(1);
  expect(repository.create).toHaveBeenCalledWith(
    'space',
    {
      _reserved: true,
      description: 'This is your default space!',
      disabledFeatures: [],
      name: 'Default',
      color: '#00bfb3',
    },
    { id: 'default' }
  );
});

test(`it does not attempt to recreate the default space if it already exists`, async () => {
  const deps = createMockDeps({
    defaultExists: true,
  });

  await createDefaultSpace(deps);

  const repository = deps.savedObjects.getSavedObjectsRepository();

  expect(repository.get).toHaveBeenCalledTimes(1);
  expect(repository.create).toHaveBeenCalledTimes(0);
});

test(`it throws all other errors from the saved objects client when checking for the default space`, async () => {
  const deps = createMockDeps({
    defaultExists: true,
    simulateGetErrorCondition: true,
  });

  expect(createDefaultSpace(deps)).rejects.toThrowErrorMatchingSnapshot();
});

test(`it ignores conflict errors if the default space already exists`, async () => {
  const deps = createMockDeps({
    defaultExists: false,
    simulateConflict: true,
  });

  await createDefaultSpace(deps);

  const repository = deps.savedObjects.getSavedObjectsRepository();

  expect(repository.get).toHaveBeenCalledTimes(1);
  expect(repository.create).toHaveBeenCalledTimes(1);
});

test(`it throws other errors if there is an error creating the default space`, async () => {
  const deps = createMockDeps({
    defaultExists: false,
    simulateCreateErrorCondition: true,
  });

  expect(createDefaultSpace(deps)).rejects.toThrowErrorMatchingSnapshot();
});
