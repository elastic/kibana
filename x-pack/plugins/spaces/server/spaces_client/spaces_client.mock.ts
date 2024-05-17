/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';

import type { Space } from '../../common';
import { DEFAULT_SPACE_ID } from '../../common/constants';
import type { SpacesClient } from './spaces_client';

const createSpacesClientMock = () => {
  const repositoryMock = savedObjectsRepositoryMock.create();
  return {
    getAll: jest.fn().mockResolvedValue([
      {
        id: DEFAULT_SPACE_ID,
        name: 'mock default space',
        disabledFeatures: [],
        _reserved: true,
      },
    ]),
    get: jest.fn().mockImplementation((spaceId: string) => {
      return Promise.resolve({
        id: spaceId,
        name: `mock space for ${spaceId}`,
        disabledFeatures: [],
      });
    }),
    create: jest.fn().mockImplementation((space: Space) => Promise.resolve(space)),
    update: jest.fn().mockImplementation((space: Space) => Promise.resolve(space)),
    createSavedObjectFinder: repositoryMock.createPointInTimeFinder,
    delete: jest.fn(),
    disableLegacyUrlAliases: jest.fn(),
  } as unknown as jest.Mocked<SpacesClient>;
};
export const spacesClientMock = {
  create: createSpacesClientMock,
};
