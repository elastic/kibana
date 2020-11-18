/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesClient } from './spaces_client';
import { ConfigType, ConfigSchema } from '../config';
import { ISavedObjectsRepository } from 'src/core/server';
import { GetAllSpacesPurpose } from '../../common/model/types';
import { savedObjectsRepositoryMock } from '../../../../../src/core/server/mocks';

const createMockDebugLogger = () => {
  return jest.fn();
};

const createMockConfig = (mockConfig: ConfigType = { maxSpaces: 1000, enabled: true }) => {
  return ConfigSchema.validate(mockConfig);
};

describe('#getAll', () => {
  const savedObjects = [
    {
      id: 'foo',
      attributes: {
        name: 'foo-name',
        description: 'foo-description',
        bar: 'foo-bar',
      },
    },
    {
      id: 'bar',
      attributes: {
        name: 'bar-name',
        description: 'bar-description',
        bar: 'bar-bar',
      },
    },
    {
      id: 'baz',
      attributes: {
        name: 'baz-name',
        description: 'baz-description',
        bar: 'baz-bar',
      },
    },
  ];

  const expectedSpaces = [
    {
      id: 'foo',
      name: 'foo-name',
      description: 'foo-description',
      bar: 'foo-bar',
    },
    {
      id: 'bar',
      name: 'bar-name',
      description: 'bar-description',
      bar: 'bar-bar',
    },
    {
      id: 'baz',
      name: 'baz-name',
      description: 'baz-description',
      bar: 'baz-bar',
    },
  ];

  test(`finds spaces using callWithRequestRepository`, async () => {
    const mockDebugLogger = createMockDebugLogger();
    const mockCallWithRequestRepository = savedObjectsRepositoryMock.create();
    mockCallWithRequestRepository.find.mockResolvedValue({
      saved_objects: savedObjects,
    } as any);
    const mockConfig = createMockConfig({
      maxSpaces: 1234,
      enabled: true,
    });

    const client = new SpacesClient(mockDebugLogger, mockConfig, mockCallWithRequestRepository);
    const actualSpaces = await client.getAll();

    expect(actualSpaces).toEqual(expectedSpaces);
    expect(mockCallWithRequestRepository.find).toHaveBeenCalledWith({
      type: 'space',
      page: 1,
      perPage: mockConfig.maxSpaces,
      sortField: 'name.keyword',
    });
  });

  test(`throws Boom.badRequest when an invalid purpose is provided'`, async () => {
    const client = new SpacesClient(null as any, null as any, null as any);
    await expect(
      client.getAll({ purpose: 'invalid_purpose' as GetAllSpacesPurpose })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"unsupported space purpose: invalid_purpose"`);
  });
});

describe('#get', () => {
  const savedObject = {
    id: 'foo',
    type: 'foo',
    references: [],
    attributes: {
      name: 'foo-name',
      description: 'foo-description',
      bar: 'foo-bar',
    },
  };

  const expectedSpace = {
    id: 'foo',
    name: 'foo-name',
    description: 'foo-description',
    bar: 'foo-bar',
  };

  test(`gets space using callWithRequestRepository`, async () => {
    const mockDebugLogger = createMockDebugLogger();
    const mockConfig = createMockConfig();
    const mockCallWithRequestRepository = savedObjectsRepositoryMock.create();
    mockCallWithRequestRepository.get.mockResolvedValue(savedObject);

    const client = new SpacesClient(
      mockDebugLogger,
      mockConfig,
      (mockCallWithRequestRepository as unknown) as ISavedObjectsRepository
    );
    const id = savedObject.id;
    const actualSpace = await client.get(id);

    expect(actualSpace).toEqual(expectedSpace);
    expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
  });
});

describe('#create', () => {
  const id = 'foo';

  const spaceToCreate = {
    id,
    name: 'foo-name',
    description: 'foo-description',
    bar: 'foo-bar',
    _reserved: true,
    disabledFeatures: [],
  };

  const attributes = {
    name: 'foo-name',
    description: 'foo-description',
    bar: 'foo-bar',
    disabledFeatures: [],
  };

  const savedObject = {
    id,
    type: 'foo',
    references: [],
    attributes: {
      name: 'foo-name',
      description: 'foo-description',
      bar: 'foo-bar',
      disabledFeatures: [],
    },
  };

  const expectedReturnedSpace = {
    id,
    name: 'foo-name',
    description: 'foo-description',
    bar: 'foo-bar',
    disabledFeatures: [],
  };

  test(`creates space using callWithRequestRepository when we're under the max`, async () => {
    const maxSpaces = 5;
    const mockDebugLogger = createMockDebugLogger();
    const mockCallWithRequestRepository = savedObjectsRepositoryMock.create();
    mockCallWithRequestRepository.create.mockResolvedValue(savedObject);
    mockCallWithRequestRepository.find.mockResolvedValue({
      total: maxSpaces - 1,
    } as any);

    const mockConfig = createMockConfig({
      maxSpaces,
      enabled: true,
    });

    const client = new SpacesClient(
      mockDebugLogger,
      mockConfig,
      (mockCallWithRequestRepository as unknown) as ISavedObjectsRepository
    );

    const actualSpace = await client.create(spaceToCreate);

    expect(actualSpace).toEqual(expectedReturnedSpace);
    expect(mockCallWithRequestRepository.find).toHaveBeenCalledWith({
      type: 'space',
      page: 1,
      perPage: 0,
    });
    expect(mockCallWithRequestRepository.create).toHaveBeenCalledWith('space', attributes, {
      id,
    });
  });

  test(`throws bad request when we are at the maximum number of spaces`, async () => {
    const maxSpaces = 5;
    const mockDebugLogger = createMockDebugLogger();
    const mockCallWithRequestRepository = savedObjectsRepositoryMock.create();
    mockCallWithRequestRepository.create.mockResolvedValue(savedObject);
    mockCallWithRequestRepository.find.mockResolvedValue({
      total: maxSpaces,
    } as any);

    const mockConfig = createMockConfig({
      maxSpaces,
      enabled: true,
    });

    const client = new SpacesClient(
      mockDebugLogger,
      mockConfig,
      (mockCallWithRequestRepository as unknown) as ISavedObjectsRepository
    );

    expect(client.create(spaceToCreate)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unable to create Space, this exceeds the maximum number of spaces set by the xpack.spaces.maxSpaces setting"`
    );

    expect(mockCallWithRequestRepository.find).toHaveBeenCalledWith({
      type: 'space',
      page: 1,
      perPage: 0,
    });
    expect(mockCallWithRequestRepository.create).not.toHaveBeenCalled();
  });
});

describe('#update', () => {
  const spaceToUpdate = {
    id: 'foo',
    name: 'foo-name',
    description: 'foo-description',
    bar: 'foo-bar',
    _reserved: false,
    disabledFeatures: [],
  };

  const attributes = {
    name: 'foo-name',
    description: 'foo-description',
    bar: 'foo-bar',
    disabledFeatures: [],
  };

  const savedObject = {
    id: 'foo',
    type: 'foo',
    references: [],
    attributes: {
      name: 'foo-name',
      description: 'foo-description',
      bar: 'foo-bar',
      _reserved: true,
      disabledFeatures: [],
    },
  };

  const expectedReturnedSpace = {
    id: 'foo',
    name: 'foo-name',
    description: 'foo-description',
    bar: 'foo-bar',
    _reserved: true,
    disabledFeatures: [],
  };

  test(`updates space using callWithRequestRepository`, async () => {
    const mockDebugLogger = createMockDebugLogger();
    const mockConfig = createMockConfig();
    const mockCallWithRequestRepository = savedObjectsRepositoryMock.create();
    mockCallWithRequestRepository.get.mockResolvedValue(savedObject);

    const client = new SpacesClient(
      mockDebugLogger,
      mockConfig,
      (mockCallWithRequestRepository as unknown) as ISavedObjectsRepository
    );
    const id = savedObject.id;
    const actualSpace = await client.update(id, spaceToUpdate);

    expect(actualSpace).toEqual(expectedReturnedSpace);
    expect(mockCallWithRequestRepository.update).toHaveBeenCalledWith('space', id, attributes);
    expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
  });
});

describe('#delete', () => {
  const id = 'foo';

  const reservedSavedObject = {
    id,
    attributes: {
      name: 'foo-name',
      description: 'foo-description',
      bar: 'foo-bar',
      _reserved: true,
    },
  };

  const notReservedSavedObject = {
    id,
    type: 'foo',
    references: [],
    attributes: {
      name: 'foo-name',
      description: 'foo-description',
      bar: 'foo-bar',
    },
  };

  test(`throws bad request when the space is reserved`, async () => {
    const mockDebugLogger = createMockDebugLogger();
    const mockConfig = createMockConfig();
    const mockCallWithRequestRepository = {
      get: jest.fn().mockReturnValue(reservedSavedObject),
    };

    const client = new SpacesClient(
      mockDebugLogger,
      mockConfig,
      (mockCallWithRequestRepository as unknown) as ISavedObjectsRepository
    );

    expect(client.delete(id)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"This Space cannot be deleted because it is reserved."`
    );

    expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
  });

  test(`deletes space using callWithRequestRepository when space isn't reserved`, async () => {
    const mockDebugLogger = createMockDebugLogger();
    const mockConfig = createMockConfig();
    const mockCallWithRequestRepository = savedObjectsRepositoryMock.create();
    mockCallWithRequestRepository.get.mockResolvedValue(notReservedSavedObject);

    const client = new SpacesClient(
      mockDebugLogger,
      mockConfig,
      (mockCallWithRequestRepository as unknown) as ISavedObjectsRepository
    );

    await client.delete(id);

    expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
    expect(mockCallWithRequestRepository.delete).toHaveBeenCalledWith('space', id);
    expect(mockCallWithRequestRepository.deleteByNamespace).toHaveBeenCalledWith(id);
  });
});
