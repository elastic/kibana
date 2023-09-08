/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import type { SavedObject } from '@kbn/core-saved-objects-server';

import { SpacesClient } from './spaces_client';
import type { GetAllSpacesPurpose, Space } from '../../common';
import type { ConfigType } from '../config';
import { ConfigSchema } from '../config';

const createMockDebugLogger = () => {
  return jest.fn();
};

const createMockConfig = (
  mockConfig: ConfigType = {
    enabled: true,
    maxSpaces: 1000,
    allowFeatureVisibility: true,
  }
) => {
  return ConfigSchema.validate(mockConfig, { serverless: !mockConfig.allowFeatureVisibility });
};

describe('#getAll', () => {
  const savedObjects: Array<SavedObject<unknown>> = [
    {
      // foo has all of the attributes expected by the space interface
      id: 'foo',
      type: 'space',
      references: [],
      attributes: {
        name: 'foo-name',
        description: 'foo-description',
        color: '#FFFFFF',
        initials: 'FB',
        imageUrl: 'go-bots/predates/transformers',
        disabledFeatures: [],
        _reserved: true,
        bar: 'foo-bar', // an extra attribute that will be ignored during conversion
      },
    },
    {
      // bar his missing attributes of color and image url
      id: 'bar',
      type: 'space',
      references: [],
      attributes: {
        name: 'bar-name',
        description: 'bar-description',
        initials: 'BA',
        disabledFeatures: [],
        bar: 'bar-bar', // an extra attribute that will be ignored during conversion
      },
    },
    {
      // baz only has the bare minumum atributes
      id: 'baz',
      type: 'space',
      references: [],
      attributes: {
        name: 'baz-name',
        description: 'baz-description',
        bar: 'baz-bar', // an extra attribute that will be ignored during conversion
      },
    },
  ];

  const expectedSpaces: Space[] = [
    {
      id: 'foo',
      name: 'foo-name',
      description: 'foo-description',
      color: '#FFFFFF',
      initials: 'FB',
      imageUrl: 'go-bots/predates/transformers',
      disabledFeatures: [],
      _reserved: true,
    },
    {
      id: 'bar',
      name: 'bar-name',
      description: 'bar-description',
      initials: 'BA',
      disabledFeatures: [],
    },
    {
      id: 'baz',
      name: 'baz-name',
      description: 'baz-description',
      disabledFeatures: [],
    },
  ];

  test(`finds spaces using callWithRequestRepository`, async () => {
    const mockDebugLogger = createMockDebugLogger();
    const mockCallWithRequestRepository = savedObjectsRepositoryMock.create();
    mockCallWithRequestRepository.find.mockResolvedValue({
      saved_objects: savedObjects,
    } as any);
    const mockConfig = createMockConfig();

    const client = new SpacesClient(mockDebugLogger, mockConfig, mockCallWithRequestRepository, []);
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
    const mockDebugLogger = createMockDebugLogger();
    const mockCallWithRequestRepository = savedObjectsRepositoryMock.create();
    const mockConfig = createMockConfig();
    const client = new SpacesClient(mockDebugLogger, mockConfig, mockCallWithRequestRepository, []);
    await expect(
      client.getAll({ purpose: 'invalid_purpose' as GetAllSpacesPurpose })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"unsupported space purpose: invalid_purpose"`);
  });
});

describe('#get', () => {
  const savedObject: SavedObject = {
    id: 'foo',
    type: 'space',
    references: [],
    attributes: {
      name: 'foo-name',
      description: 'foo-description',
      color: '#FFFFFF',
      initials: 'FB',
      imageUrl: 'go-bots/predates/transformers',
      disabledFeatures: [],
      _reserved: true,
      bar: 'foo-bar', // an extra attribute that will be ignored during conversion
    },
  };

  const expectedSpace: Space = {
    id: 'foo',
    name: 'foo-name',
    description: 'foo-description',
    color: '#FFFFFF',
    initials: 'FB',
    imageUrl: 'go-bots/predates/transformers',
    disabledFeatures: [],
    _reserved: true,
  };

  test(`gets space using callWithRequestRepository`, async () => {
    const mockDebugLogger = createMockDebugLogger();
    const mockConfig = createMockConfig();
    const mockCallWithRequestRepository = savedObjectsRepositoryMock.create();
    mockCallWithRequestRepository.get.mockResolvedValue(savedObject);

    const client = new SpacesClient(mockDebugLogger, mockConfig, mockCallWithRequestRepository, []);
    const id = savedObject.id;
    const actualSpace = await client.get(id);

    expect(actualSpace).toEqual(expectedSpace);
    expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
  });
});

describe('#create', () => {
  const id = 'foo';
  const attributes = {
    name: 'foo-name',
    description: 'foo-description',
    color: '#FFFFFF',
    initials: 'FB',
    imageUrl: 'go-bots/predates/transformers',
    disabledFeatures: [],
  };

  const spaceToCreate = {
    id,
    ...attributes,
    _reserved: true,
    bar: 'foo-bar', // will not make it to the saved object attributes
  };

  const savedObject: SavedObject = {
    id,
    type: 'space',
    references: [],
    attributes: {
      ...attributes,
      foo: 'bar', // will get stripped in conversion
    },
  };

  const expectedReturnedSpace: Space = {
    id,
    ...attributes,
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
      enabled: true,
      maxSpaces,
      allowFeatureVisibility: true,
    });

    const client = new SpacesClient(mockDebugLogger, mockConfig, mockCallWithRequestRepository, []);

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
      enabled: true,
      maxSpaces,
      allowFeatureVisibility: true,
    });

    const client = new SpacesClient(mockDebugLogger, mockConfig, mockCallWithRequestRepository, []);

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

  describe('when config.allowFeatureVisibility is disabled', () => {
    test(`creates space without disabledFeatures`, async () => {
      const maxSpaces = 5;
      const mockDebugLogger = createMockDebugLogger();
      const mockCallWithRequestRepository = savedObjectsRepositoryMock.create();
      mockCallWithRequestRepository.create.mockResolvedValue(savedObject);
      mockCallWithRequestRepository.find.mockResolvedValue({
        total: maxSpaces - 1,
      } as any);

      const mockConfig = createMockConfig({
        enabled: true,
        maxSpaces,
        allowFeatureVisibility: false,
      });

      const client = new SpacesClient(
        mockDebugLogger,
        mockConfig,
        mockCallWithRequestRepository,
        []
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

    test(`throws bad request when creating space with disabledFeatures`, async () => {
      const maxSpaces = 5;
      const mockDebugLogger = createMockDebugLogger();
      const mockCallWithRequestRepository = savedObjectsRepositoryMock.create();
      mockCallWithRequestRepository.create.mockResolvedValue(savedObject);
      mockCallWithRequestRepository.find.mockResolvedValue({
        total: maxSpaces - 1,
      } as any);

      const mockConfig = createMockConfig({
        enabled: true,
        maxSpaces,
        allowFeatureVisibility: false,
      });

      const client = new SpacesClient(
        mockDebugLogger,
        mockConfig,
        mockCallWithRequestRepository,
        []
      );

      expect(
        client.create({ ...spaceToCreate, disabledFeatures: ['some-feature'] })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unable to create Space, the disabledFeatures array must be empty when xpack.spaces.allowFeatureVisibility setting is disabled"`
      );

      expect(mockCallWithRequestRepository.find).toHaveBeenCalledWith({
        type: 'space',
        page: 1,
        perPage: 0,
      });
      expect(mockCallWithRequestRepository.create).not.toHaveBeenCalled();
    });
  });
});

describe('#update', () => {
  const attributes = {
    name: 'foo-name',
    description: 'foo-description',
    color: '#FFFFFF',
    initials: 'FB',
    imageUrl: 'go-bots/predates/transformers',
    disabledFeatures: [],
  };

  const spaceToUpdate = {
    id: 'foo',
    ...attributes,
    _reserved: false, // will have no affect
    bar: 'foo-bar', // will not make it to the saved object attributes
  };

  const savedObject: SavedObject = {
    id: 'foo',
    type: 'space',
    references: [],
    attributes: {
      ...attributes,
      _reserved: true,
      foo: 'bar', // will get stripped in conversion
    },
  };

  const expectedReturnedSpace: Space = {
    id: 'foo',
    ...attributes,
    _reserved: true,
  };

  test(`updates space using callWithRequestRepository`, async () => {
    const mockDebugLogger = createMockDebugLogger();
    const mockConfig = createMockConfig();
    const mockCallWithRequestRepository = savedObjectsRepositoryMock.create();
    mockCallWithRequestRepository.get.mockResolvedValue(savedObject);

    const client = new SpacesClient(mockDebugLogger, mockConfig, mockCallWithRequestRepository, []);
    const id = savedObject.id;
    const actualSpace = await client.update(id, spaceToUpdate);

    expect(actualSpace).toEqual(expectedReturnedSpace);
    expect(mockCallWithRequestRepository.update).toHaveBeenCalledWith('space', id, attributes);
    expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
  });

  describe('when config.allowFeatureVisibility is disabled', () => {
    test(`updates space without disabledFeatures`, async () => {
      const mockDebugLogger = createMockDebugLogger();
      const mockConfig = createMockConfig({
        enabled: true,
        maxSpaces: 1000,
        allowFeatureVisibility: false,
      });
      const mockCallWithRequestRepository = savedObjectsRepositoryMock.create();
      mockCallWithRequestRepository.get.mockResolvedValue(savedObject);

      const client = new SpacesClient(
        mockDebugLogger,
        mockConfig,
        mockCallWithRequestRepository,
        []
      );
      const id = savedObject.id;
      const actualSpace = await client.update(id, spaceToUpdate);

      expect(actualSpace).toEqual(expectedReturnedSpace);
      expect(mockCallWithRequestRepository.update).toHaveBeenCalledWith('space', id, attributes);
      expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
    });

    test(`throws bad request when updating space with disabledFeatures`, async () => {
      const mockDebugLogger = createMockDebugLogger();
      const mockConfig = createMockConfig({
        enabled: true,
        maxSpaces: 1000,
        allowFeatureVisibility: false,
      });
      const mockCallWithRequestRepository = savedObjectsRepositoryMock.create();
      mockCallWithRequestRepository.get.mockResolvedValue(savedObject);

      const client = new SpacesClient(
        mockDebugLogger,
        mockConfig,
        mockCallWithRequestRepository,
        []
      );
      const id = savedObject.id;

      expect(
        client.update(id, { ...spaceToUpdate, disabledFeatures: ['some-feature'] })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unable to update Space, the disabledFeatures array must be empty when xpack.spaces.allowFeatureVisibility setting is disabled"`
      );

      expect(mockCallWithRequestRepository.update).not.toHaveBeenCalled();
      expect(mockCallWithRequestRepository.get).not.toHaveBeenCalled();
    });
  });
});

describe('#delete', () => {
  const id = 'foo';

  const reservedSavedObject: SavedObject = {
    id,
    type: 'space',
    references: [],
    attributes: {
      name: 'foo-name',
      description: 'foo-description',
      bar: 'foo-bar',
      _reserved: true,
    },
  };

  const notReservedSavedObject: SavedObject = {
    id,
    type: 'space',
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
    const mockCallWithRequestRepository = savedObjectsRepositoryMock.create();
    mockCallWithRequestRepository.get.mockResolvedValue(reservedSavedObject);

    const client = new SpacesClient(mockDebugLogger, mockConfig, mockCallWithRequestRepository, []);

    expect(client.delete(id)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The foo space cannot be deleted because it is reserved."`
    );

    expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
  });

  test(`deletes space using callWithRequestRepository when space isn't reserved`, async () => {
    const mockDebugLogger = createMockDebugLogger();
    const mockConfig = createMockConfig();
    const mockCallWithRequestRepository = savedObjectsRepositoryMock.create();
    mockCallWithRequestRepository.get.mockResolvedValue(notReservedSavedObject);

    const client = new SpacesClient(mockDebugLogger, mockConfig, mockCallWithRequestRepository, []);

    await client.delete(id);

    expect(mockCallWithRequestRepository.get).toHaveBeenCalledWith('space', id);
    expect(mockCallWithRequestRepository.delete).toHaveBeenCalledWith('space', id);
    expect(mockCallWithRequestRepository.deleteByNamespace).toHaveBeenCalledWith(id);
  });
});

describe('#disableLegacyUrlAliases', () => {
  test(`updates legacy URL aliases using callWithRequestRepository`, async () => {
    const mockDebugLogger = createMockDebugLogger();
    const mockConfig = createMockConfig();
    const mockCallWithRequestRepository = savedObjectsRepositoryMock.create();

    const client = new SpacesClient(mockDebugLogger, mockConfig, mockCallWithRequestRepository, []);
    const aliases = [
      { targetSpace: 'space1', targetType: 'foo', sourceId: '123' },
      { targetSpace: 'space2', targetType: 'bar', sourceId: '456' },
    ];
    await client.disableLegacyUrlAliases(aliases);

    expect(mockCallWithRequestRepository.bulkUpdate).toHaveBeenCalledTimes(1);
    expect(mockCallWithRequestRepository.bulkUpdate).toHaveBeenCalledWith([
      { type: 'legacy-url-alias', id: 'space1:foo:123', attributes: { disabled: true } },
      { type: 'legacy-url-alias', id: 'space2:bar:456', attributes: { disabled: true } },
    ]);
  });
});
