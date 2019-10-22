/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { Space } from '../../../common/model/space';
import { SpacesClient } from './spaces_client';

const createSpacesClientMock = () =>
  (({
    canEnumerateSpaces: jest.fn().mockResolvedValue(true),
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
    delete: jest.fn(),
  } as unknown) as jest.Mocked<SpacesClient>);

export const spacesClientMock = {
  create: createSpacesClientMock,
};
