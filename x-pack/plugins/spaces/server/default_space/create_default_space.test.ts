/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createDefaultSpace } from './create_default_space';
import { SavedObjectsErrorHelpers } from 'src/core/server';
import { loggingSystemMock } from '../../../../../src/core/server/mocks';

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

  const mockGet = jest.fn().mockImplementation((type, id) => {
    if (simulateGetErrorCondition) {
      throw new Error('unit test: unexpected exception condition');
    }

    if (defaultExists) {
      return;
    }
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
  });

  const mockCreate = jest.fn().mockImplementation(() => {
    if (simulateConflict) {
      throw SavedObjectsErrorHelpers.decorateConflictError(
        new Error('unit test: default space already exists')
      );
    }
    if (simulateCreateErrorCondition) {
      throw new Error('unit test: some other unexpected error');
    }

    return null;
  });

  return {
    getSavedObjects: () =>
      Promise.resolve({
        createInternalRepository: jest.fn().mockImplementation(() => {
          return {
            get: mockGet,
            create: mockCreate,
          };
        }),
      }),
    logger: loggingSystemMock.createLogger(),
  };
};

test(`it creates the default space when one does not exist`, async () => {
  const deps = createMockDeps({
    defaultExists: false,
  });

  await createDefaultSpace(deps);

  const repository = (await deps.getSavedObjects()).createInternalRepository();

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

  const repository = (await deps.getSavedObjects()).createInternalRepository();

  expect(repository.get).toHaveBeenCalledTimes(1);
  expect(repository.create).toHaveBeenCalledTimes(0);
});

test(`it throws all other errors from the saved objects client when checking for the default space`, async () => {
  const deps = createMockDeps({
    defaultExists: true,
    simulateGetErrorCondition: true,
  });

  expect(createDefaultSpace(deps)).rejects.toThrowErrorMatchingInlineSnapshot(
    `"unit test: unexpected exception condition"`
  );
});

test(`it ignores conflict errors if the default space already exists`, async () => {
  const deps = createMockDeps({
    defaultExists: false,
    simulateConflict: true,
  });

  await createDefaultSpace(deps);

  const repository = (await deps.getSavedObjects()).createInternalRepository();

  expect(repository.get).toHaveBeenCalledTimes(1);
  expect(repository.create).toHaveBeenCalledTimes(1);
});

test(`it throws other errors if there is an error creating the default space`, async () => {
  const deps = createMockDeps({
    defaultExists: false,
    simulateCreateErrorCondition: true,
  });

  expect(createDefaultSpace(deps)).rejects.toThrowErrorMatchingInlineSnapshot(
    `"unit test: some other unexpected error"`
  );
});
