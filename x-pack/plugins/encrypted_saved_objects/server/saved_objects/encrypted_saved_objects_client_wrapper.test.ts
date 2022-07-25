/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsBulkResolveResponse, SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock, savedObjectsTypeRegistryMock } from '@kbn/core/server/mocks';
import { mockAuthenticatedUser } from '@kbn/security-plugin/common/model/authenticated_user.mock';

import type { EncryptedSavedObjectsService } from '../crypto';
import { EncryptionError } from '../crypto';
import { EncryptionErrorOperation } from '../crypto/encryption_error';
import { encryptedSavedObjectsServiceMock } from '../crypto/index.mock';
import { EncryptedSavedObjectsClientWrapper } from './encrypted_saved_objects_client_wrapper';

jest.mock('@kbn/core/server/saved_objects/service/lib/utils', () => {
  const { SavedObjectsUtils } = jest.requireActual(
    '@kbn/core/server/saved_objects/service/lib/utils'
  );
  return {
    SavedObjectsUtils: {
      namespaceStringToId: SavedObjectsUtils.namespaceStringToId,
      isRandomId: SavedObjectsUtils.isRandomId,
      generateId: () => 'mock-saved-object-id',
    },
  };
});

let wrapper: EncryptedSavedObjectsClientWrapper;
let mockBaseClient: jest.Mocked<SavedObjectsClientContract>;
let mockBaseTypeRegistry: ReturnType<typeof savedObjectsTypeRegistryMock.create>;
let encryptedSavedObjectsServiceMockInstance: jest.Mocked<EncryptedSavedObjectsService>;
beforeEach(() => {
  mockBaseClient = savedObjectsClientMock.create();
  mockBaseTypeRegistry = savedObjectsTypeRegistryMock.create();
  encryptedSavedObjectsServiceMockInstance = encryptedSavedObjectsServiceMock.createWithTypes([
    {
      type: 'known-type',
      attributesToEncrypt: new Set([
        'attrSecret',
        { key: 'attrNotSoSecret', dangerouslyExposeValue: true },
      ]),
    },
  ]);

  wrapper = new EncryptedSavedObjectsClientWrapper({
    service: encryptedSavedObjectsServiceMockInstance,
    baseClient: mockBaseClient,
    baseTypeRegistry: mockBaseTypeRegistry,
    getCurrentUser: () => mockAuthenticatedUser(),
  } as any);
});

afterEach(() => jest.clearAllMocks());

describe('#checkConflicts', () => {
  it('redirects request to underlying base client', async () => {
    const objects = [{ type: 'foo', id: 'bar' }];
    const options = { namespace: 'some-namespace' };
    const mockedResponse = { errors: [] };
    mockBaseClient.checkConflicts.mockResolvedValue(mockedResponse);

    await expect(wrapper.checkConflicts(objects, options)).resolves.toEqual(mockedResponse);
    expect(mockBaseClient.checkConflicts).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.checkConflicts).toHaveBeenCalledWith(objects, options);
  });
});

describe('#create', () => {
  it('redirects request to underlying base client if type is not registered', async () => {
    const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };
    const options = { id: 'some-non-uuid-v4-id' };
    const mockedResponse = { id: options.id, type: 'unknown-type', attributes, references: [] };

    mockBaseClient.create.mockResolvedValue(mockedResponse);

    await expect(wrapper.create('unknown-type', attributes, options)).resolves.toEqual({
      ...mockedResponse,
      id: options.id,
      attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
    });
    expect(mockBaseClient.create).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.create).toHaveBeenCalledWith('unknown-type', attributes, options);
  });

  it('fails if type is registered and non-UUID ID is specified', async () => {
    const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };

    await expect(wrapper.create('known-type', attributes, { id: 'some-id' })).rejects.toThrowError(
      'Predefined IDs are not allowed for saved objects with encrypted attributes unless the ID is a UUID.'
    );

    expect(mockBaseClient.create).not.toHaveBeenCalled();
  });

  it('allows a specified ID when overwriting an existing object', async () => {
    const attributes = {
      attrOne: 'one',
      attrSecret: 'secret',
      attrNotSoSecret: 'not-so-secret',
      attrThree: 'three',
    };
    const options = { id: 'predefined-uuid', overwrite: true, version: 'some-version' };
    const mockedResponse = {
      id: 'predefined-uuid',
      type: 'known-type',
      attributes: {
        attrOne: 'one',
        attrSecret: '*secret*',
        attrNotSoSecret: '*not-so-secret*',
        attrThree: 'three',
      },
      references: [],
    };

    mockBaseClient.create.mockResolvedValue(mockedResponse);

    expect(await wrapper.create('known-type', attributes, options)).toEqual({
      ...mockedResponse,
      attributes: { attrOne: 'one', attrNotSoSecret: 'not-so-secret', attrThree: 'three' },
    });

    expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledTimes(1);
    expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'predefined-uuid' },
      {
        attrOne: 'one',
        attrSecret: 'secret',
        attrNotSoSecret: 'not-so-secret',
        attrThree: 'three',
      },
      { user: mockAuthenticatedUser() }
    );

    expect(mockBaseClient.create).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.create).toHaveBeenCalledWith(
      'known-type',
      {
        attrOne: 'one',
        attrSecret: '*secret*',
        attrNotSoSecret: '*not-so-secret*',
        attrThree: 'three',
      },
      { id: 'predefined-uuid', overwrite: true, version: 'some-version' }
    );
  });

  it('generates ID, encrypts attributes and strips them from response except for ones with `dangerouslyExposeValue` set to `true`', async () => {
    const attributes = {
      attrOne: 'one',
      attrSecret: 'secret',
      attrNotSoSecret: 'not-so-secret',
      attrThree: 'three',
    };
    const options = { overwrite: true };
    const mockedResponse = {
      id: 'mock-saved-object-id',
      type: 'known-type',
      attributes: {
        attrOne: 'one',
        attrSecret: '*secret*',
        attrNotSoSecret: '*not-so-secret*',
        attrThree: 'three',
      },
      references: [],
    };

    mockBaseClient.create.mockResolvedValue(mockedResponse);

    expect(await wrapper.create('known-type', attributes, options)).toEqual({
      ...mockedResponse,
      attributes: { attrOne: 'one', attrNotSoSecret: 'not-so-secret', attrThree: 'three' },
    });

    expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledTimes(1);
    expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'mock-saved-object-id' },
      {
        attrOne: 'one',
        attrSecret: 'secret',
        attrNotSoSecret: 'not-so-secret',
        attrThree: 'three',
      },
      { user: mockAuthenticatedUser() }
    );

    expect(mockBaseClient.create).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.create).toHaveBeenCalledWith(
      'known-type',
      {
        attrOne: 'one',
        attrSecret: '*secret*',
        attrNotSoSecret: '*not-so-secret*',
        attrThree: 'three',
      },
      { id: 'mock-saved-object-id', overwrite: true }
    );
  });

  describe('namespace', () => {
    const doTest = async (namespace: string, expectNamespaceInDescriptor: boolean) => {
      const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };
      const options = { overwrite: true, namespace };
      const mockedResponse = {
        id: 'mock-saved-object-id',
        type: 'known-type',
        attributes: { attrOne: 'one', attrSecret: '*secret*', attrThree: 'three' },
        references: [],
      };

      mockBaseClient.create.mockResolvedValue(mockedResponse);

      expect(await wrapper.create('known-type', attributes, options)).toEqual({
        ...mockedResponse,
        attributes: { attrOne: 'one', attrThree: 'three' },
      });

      expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledTimes(1);
      expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledWith(
        {
          type: 'known-type',
          id: 'mock-saved-object-id',
          namespace: expectNamespaceInDescriptor ? namespace : undefined,
        },
        { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
        { user: mockAuthenticatedUser() }
      );

      expect(mockBaseClient.create).toHaveBeenCalledTimes(1);
      expect(mockBaseClient.create).toHaveBeenCalledWith(
        'known-type',
        { attrOne: 'one', attrSecret: '*secret*', attrThree: 'three' },
        { id: 'mock-saved-object-id', overwrite: true, namespace }
      );
    };

    it('uses `namespace` to encrypt attributes if it is specified when type is single-namespace', async () => {
      await doTest('some-namespace', true);
    });

    it('does not use `namespace` to encrypt attributes if it is specified when type is not single-namespace', async () => {
      mockBaseTypeRegistry.isSingleNamespace.mockReturnValue(false);
      await doTest('some-namespace', false);
    });
  });

  it('fails if base client fails', async () => {
    const failureReason = new Error('Something bad happened...');
    mockBaseClient.create.mockRejectedValue(failureReason);

    await expect(
      wrapper.create('known-type', { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' })
    ).rejects.toThrowError(failureReason);

    expect(mockBaseClient.create).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.create).toHaveBeenCalledWith(
      'known-type',
      { attrOne: 'one', attrSecret: '*secret*', attrThree: 'three' },
      { id: 'mock-saved-object-id' }
    );
  });
});

describe('#bulkCreate', () => {
  it('does not fail if ID is specified for not registered type', async () => {
    const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };
    const options = { namespace: 'some-namespace' };
    const mockedResponse = {
      saved_objects: [
        {
          id: 'mock-saved-object-id',
          type: 'known-type',
          attributes,
          references: [],
        },
        {
          id: 'some-id',
          type: 'unknown-type',
          attributes,
          references: [],
        },
      ],
    };

    mockBaseClient.bulkCreate.mockResolvedValue(mockedResponse);

    const bulkCreateParams = [
      { type: 'known-type', attributes },
      { id: 'some-id', type: 'unknown-type', attributes },
    ];

    await expect(wrapper.bulkCreate(bulkCreateParams, options)).resolves.toEqual({
      saved_objects: [
        { ...mockedResponse.saved_objects[0], attributes: { attrOne: 'one', attrThree: 'three' } },
        mockedResponse.saved_objects[1],
      ],
    });

    expect(mockBaseClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.bulkCreate).toHaveBeenCalledWith(
      [
        {
          ...bulkCreateParams[0],
          id: 'mock-saved-object-id',
          attributes: { attrOne: 'one', attrSecret: '*secret*', attrThree: 'three' },
        },
        bulkCreateParams[1],
      ],
      options
    );
  });

  it('fails if non-UUID ID is specified for registered type', async () => {
    const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };

    const bulkCreateParams = [
      { id: 'some-id', type: 'known-type', attributes },
      { type: 'unknown-type', attributes },
    ];

    await expect(wrapper.bulkCreate(bulkCreateParams)).rejects.toThrowError(
      'Predefined IDs are not allowed for saved objects with encrypted attributes unless the ID is a UUID.'
    );

    expect(mockBaseClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('allows a specified ID when overwriting an existing object', async () => {
    const attributes = {
      attrOne: 'one',
      attrSecret: 'secret',
      attrNotSoSecret: 'not-so-secret',
      attrThree: 'three',
    };
    const mockedResponse = {
      saved_objects: [
        {
          id: 'predefined-uuid',
          type: 'known-type',
          attributes: { ...attributes, attrSecret: '*secret*', attrNotSoSecret: '*not-so-secret*' },
          references: [],
        },
        {
          id: 'some-id',
          type: 'unknown-type',
          attributes,
          references: [],
        },
      ],
    };

    mockBaseClient.bulkCreate.mockResolvedValue(mockedResponse);

    const bulkCreateParams = [
      { id: 'predefined-uuid', type: 'known-type', attributes, version: 'some-version' },
      { type: 'unknown-type', attributes },
    ];

    await expect(wrapper.bulkCreate(bulkCreateParams, { overwrite: true })).resolves.toEqual({
      saved_objects: [
        {
          ...mockedResponse.saved_objects[0],
          attributes: { attrOne: 'one', attrNotSoSecret: 'not-so-secret', attrThree: 'three' },
        },
        mockedResponse.saved_objects[1],
      ],
    });

    expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledTimes(1);
    expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'predefined-uuid' },
      {
        attrOne: 'one',
        attrSecret: 'secret',
        attrNotSoSecret: 'not-so-secret',
        attrThree: 'three',
      },
      { user: mockAuthenticatedUser() }
    );

    expect(mockBaseClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.bulkCreate).toHaveBeenCalledWith(
      [
        {
          ...bulkCreateParams[0],
          attributes: {
            attrOne: 'one',
            attrSecret: '*secret*',
            attrNotSoSecret: '*not-so-secret*',
            attrThree: 'three',
          },
        },
        bulkCreateParams[1],
      ],
      { overwrite: true }
    );
  });

  it('generates ID, encrypts attributes and strips them from response except for ones with `dangerouslyExposeValue` set to `true`', async () => {
    const attributes = {
      attrOne: 'one',
      attrSecret: 'secret',
      attrNotSoSecret: 'not-so-secret',
      attrThree: 'three',
    };
    const mockedResponse = {
      saved_objects: [
        {
          id: 'mock-saved-object-id',
          type: 'known-type',
          attributes: { ...attributes, attrSecret: '*secret*', attrNotSoSecret: '*not-so-secret*' },
          references: [],
        },
        {
          id: 'some-id',
          type: 'unknown-type',
          attributes,
          references: [],
        },
      ],
    };

    mockBaseClient.bulkCreate.mockResolvedValue(mockedResponse);

    const bulkCreateParams = [
      { type: 'known-type', attributes },
      { type: 'unknown-type', attributes },
    ];

    await expect(wrapper.bulkCreate(bulkCreateParams)).resolves.toEqual({
      saved_objects: [
        {
          ...mockedResponse.saved_objects[0],
          attributes: { attrOne: 'one', attrNotSoSecret: 'not-so-secret', attrThree: 'three' },
        },
        mockedResponse.saved_objects[1],
      ],
    });

    expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledTimes(1);
    expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'mock-saved-object-id' },
      {
        attrOne: 'one',
        attrSecret: 'secret',
        attrNotSoSecret: 'not-so-secret',
        attrThree: 'three',
      },
      { user: mockAuthenticatedUser() }
    );

    expect(mockBaseClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.bulkCreate).toHaveBeenCalledWith(
      [
        {
          ...bulkCreateParams[0],
          id: 'mock-saved-object-id',
          attributes: {
            attrOne: 'one',
            attrSecret: '*secret*',
            attrNotSoSecret: '*not-so-secret*',
            attrThree: 'three',
          },
        },
        bulkCreateParams[1],
      ],
      undefined
    );
  });

  describe('namespace', () => {
    const doTest = async (namespace: string, expectNamespaceInDescriptor: boolean) => {
      const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };
      const options = { namespace };
      const mockedResponse = {
        saved_objects: [
          { id: 'mock-saved-object-id', type: 'known-type', attributes, references: [] },
        ],
      };

      mockBaseClient.bulkCreate.mockResolvedValue(mockedResponse);

      const bulkCreateParams = [{ type: 'known-type', attributes }];
      await expect(wrapper.bulkCreate(bulkCreateParams, options)).resolves.toEqual({
        saved_objects: [
          {
            ...mockedResponse.saved_objects[0],
            attributes: { attrOne: 'one', attrThree: 'three' },
          },
        ],
      });

      expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledTimes(1);
      expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledWith(
        {
          type: 'known-type',
          id: 'mock-saved-object-id',
          namespace: expectNamespaceInDescriptor ? namespace : undefined,
        },
        { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
        { user: mockAuthenticatedUser() }
      );

      expect(mockBaseClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(mockBaseClient.bulkCreate).toHaveBeenCalledWith(
        [
          {
            ...bulkCreateParams[0],
            id: 'mock-saved-object-id',
            attributes: { attrOne: 'one', attrSecret: '*secret*', attrThree: 'three' },
          },
        ],
        options
      );
    };

    it('uses `namespace` to encrypt attributes if it is specified when type is single-namespace', async () => {
      await doTest('some-namespace', true);
    });

    it('does not use `namespace` to encrypt attributes if it is specified when type is not single-namespace', async () => {
      mockBaseTypeRegistry.isSingleNamespace.mockReturnValue(false);
      await doTest('some-namespace', false);
    });
  });

  it('fails if base client fails', async () => {
    const failureReason = new Error('Something bad happened...');
    mockBaseClient.bulkCreate.mockRejectedValue(failureReason);

    await expect(
      wrapper.bulkCreate([
        {
          type: 'known-type',
          attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
        },
      ])
    ).rejects.toThrowError(failureReason);

    expect(mockBaseClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.bulkCreate).toHaveBeenCalledWith(
      [
        {
          type: 'known-type',
          id: 'mock-saved-object-id',
          attributes: { attrOne: 'one', attrSecret: '*secret*', attrThree: 'three' },
        },
      ],
      undefined
    );
  });
});

describe('#bulkUpdate', () => {
  it('redirects request to underlying base client if type is not registered', async () => {
    const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };
    const mockedResponse = {
      saved_objects: [{ id: 'some-id', type: 'unknown-type', attributes, references: [] }],
    };

    mockBaseClient.bulkUpdate.mockResolvedValue(mockedResponse);

    await expect(
      wrapper.bulkUpdate(
        [{ type: 'unknown-type', id: 'some-id', attributes, version: 'some-version' }],
        {}
      )
    ).resolves.toEqual(mockedResponse);

    expect(mockBaseClient.bulkUpdate).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.bulkUpdate).toHaveBeenCalledWith(
      [{ type: 'unknown-type', id: 'some-id', attributes, version: 'some-version' }],
      {}
    );
  });

  it('encrypts attributes and strips them from response except for ones with `dangerouslyExposeValue` set to `true`', async () => {
    const docs = [
      {
        id: 'some-id',
        type: 'known-type',
        attributes: {
          attrOne: 'one',
          attrSecret: 'secret',
          attrNotSoSecret: 'not-so-secret',
          attrThree: 'three',
        },
      },
      {
        id: 'some-id-2',
        type: 'known-type',
        attributes: {
          attrOne: 'one 2',
          attrSecret: 'secret 2',
          attrNotSoSecret: 'not-so-secret 2',
          attrThree: 'three 2',
        },
      },
    ];

    const mockedResponse = {
      saved_objects: docs.map((doc) => ({
        ...doc,
        attributes: {
          ...doc.attributes,
          attrSecret: `*${doc.attributes.attrSecret}*`,
          attrNotSoSecret: `*${doc.attributes.attrNotSoSecret}*`,
        },
        references: undefined,
      })),
    };

    mockBaseClient.bulkUpdate.mockResolvedValue(mockedResponse);

    await expect(
      wrapper.bulkUpdate(
        docs.map((doc) => ({ ...doc })),
        {}
      )
    ).resolves.toEqual({
      saved_objects: [
        {
          id: 'some-id',
          type: 'known-type',
          attributes: {
            attrOne: 'one',
            attrNotSoSecret: 'not-so-secret',
            attrThree: 'three',
          },
        },
        {
          id: 'some-id-2',
          type: 'known-type',
          attributes: {
            attrOne: 'one 2',
            attrNotSoSecret: 'not-so-secret 2',
            attrThree: 'three 2',
          },
        },
      ],
    });

    expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledTimes(2);
    expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'some-id' },
      {
        attrOne: 'one',
        attrSecret: 'secret',
        attrNotSoSecret: 'not-so-secret',
        attrThree: 'three',
      },
      { user: mockAuthenticatedUser() }
    );
    expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'some-id-2' },
      {
        attrOne: 'one 2',
        attrSecret: 'secret 2',
        attrNotSoSecret: 'not-so-secret 2',
        attrThree: 'three 2',
      },
      { user: mockAuthenticatedUser() }
    );

    expect(mockBaseClient.bulkUpdate).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.bulkUpdate).toHaveBeenCalledWith(
      [
        {
          id: 'some-id',
          type: 'known-type',
          attributes: {
            attrOne: 'one',
            attrSecret: '*secret*',
            attrNotSoSecret: '*not-so-secret*',
            attrThree: 'three',
          },
        },
        {
          id: 'some-id-2',
          type: 'known-type',
          attributes: {
            attrOne: 'one 2',
            attrSecret: '*secret 2*',
            attrNotSoSecret: '*not-so-secret 2*',
            attrThree: 'three 2',
          },
        },
      ],
      {}
    );
  });

  describe('namespace', () => {
    interface TestParams {
      optionsNamespace: string | undefined;
      objectNamespace: string | undefined;
      expectOptionsNamespaceInDescriptor: boolean;
      expectObjectNamespaceInDescriptor: boolean;
    }
    const doTest = async ({
      optionsNamespace,
      objectNamespace,
      expectOptionsNamespaceInDescriptor,
      expectObjectNamespaceInDescriptor,
    }: TestParams) => {
      const docs = [
        {
          id: 'some-id',
          type: 'known-type',
          attributes: {
            attrOne: 'one',
            attrSecret: 'secret',
            attrThree: 'three',
          },
          version: 'some-version',
          namespace: objectNamespace,
        },
      ];
      const options = { namespace: optionsNamespace };

      mockBaseClient.bulkUpdate.mockResolvedValue({
        saved_objects: docs.map(({ namespace, ...doc }) => ({ ...doc, references: undefined })),
      });

      await expect(wrapper.bulkUpdate(docs, options)).resolves.toEqual({
        saved_objects: [
          {
            id: 'some-id',
            type: 'known-type',
            attributes: {
              attrOne: 'one',
              attrThree: 'three',
            },
            version: 'some-version',
            references: undefined,
          },
        ],
      });

      expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledTimes(1);
      expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledWith(
        {
          type: 'known-type',
          id: 'some-id',
          namespace: expectObjectNamespaceInDescriptor
            ? objectNamespace
            : expectOptionsNamespaceInDescriptor
            ? optionsNamespace
            : undefined,
        },
        { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
        { user: mockAuthenticatedUser() }
      );

      expect(mockBaseClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(mockBaseClient.bulkUpdate).toHaveBeenCalledWith(
        [
          {
            id: 'some-id',
            type: 'known-type',
            attributes: {
              attrOne: 'one',
              attrSecret: '*secret*',
              attrThree: 'three',
            },
            version: 'some-version',
            namespace: objectNamespace,
            references: undefined,
          },
        ],
        options
      );
    };

    it('does not use options `namespace` or object `namespace` to encrypt attributes if neither are specified', async () => {
      await doTest({
        optionsNamespace: undefined,
        objectNamespace: undefined,
        expectOptionsNamespaceInDescriptor: false,
        expectObjectNamespaceInDescriptor: false,
      });
    });

    describe('with a single-namespace type', () => {
      it('uses options `namespace` to encrypt attributes if it is specified and object `namespace` is not', async () => {
        await doTest({
          optionsNamespace: 'some-namespace',
          objectNamespace: undefined,
          expectOptionsNamespaceInDescriptor: true,
          expectObjectNamespaceInDescriptor: false,
        });
      });

      it('uses object `namespace` to encrypt attributes if it is specified', async () => {
        // object namespace supersedes options namespace
        await doTest({
          optionsNamespace: 'some-namespace',
          objectNamespace: 'another-namespace',
          expectOptionsNamespaceInDescriptor: false,
          expectObjectNamespaceInDescriptor: true,
        });
      });
    });

    describe('with a non-single-namespace type', () => {
      it('does not use object `namespace` or options `namespace` to encrypt attributes if it is specified', async () => {
        mockBaseTypeRegistry.isSingleNamespace.mockReturnValue(false);
        await doTest({
          optionsNamespace: 'some-namespace',
          objectNamespace: 'another-namespace',
          expectOptionsNamespaceInDescriptor: false,
          expectObjectNamespaceInDescriptor: false,
        });
      });
    });
  });

  it('fails if base client fails', async () => {
    const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };

    const failureReason = new Error('Something bad happened...');
    mockBaseClient.bulkUpdate.mockRejectedValue(failureReason);

    await expect(
      wrapper.bulkUpdate(
        [{ type: 'unknown-type', id: 'some-id', attributes, version: 'some-version' }],
        {}
      )
    ).rejects.toThrowError(failureReason);

    expect(mockBaseClient.bulkUpdate).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.bulkUpdate).toHaveBeenCalledWith(
      [{ type: 'unknown-type', id: 'some-id', attributes, version: 'some-version' }],
      {}
    );
  });
});

describe('#delete', () => {
  it('redirects request to underlying base client if type is not registered', async () => {
    const options = { namespace: 'some-ns' };

    await wrapper.delete('unknown-type', 'some-id', options);

    expect(mockBaseClient.delete).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.delete).toHaveBeenCalledWith('unknown-type', 'some-id', options);
  });

  it('redirects request to underlying base client if type is registered', async () => {
    const options = { namespace: 'some-ns' };

    await wrapper.delete('known-type', 'some-id', options);

    expect(mockBaseClient.delete).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.delete).toHaveBeenCalledWith('known-type', 'some-id', options);
  });

  it('fails if base client fails', async () => {
    const failureReason = new Error('Something bad happened...');
    mockBaseClient.delete.mockRejectedValue(failureReason);

    await expect(wrapper.delete('known-type', 'some-id')).rejects.toThrowError(failureReason);

    expect(mockBaseClient.delete).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.delete).toHaveBeenCalledWith('known-type', 'some-id', undefined);
  });
});

describe('#find', () => {
  it('redirects request to underlying base client and does not alter response if type is not registered', async () => {
    const mockedResponse = {
      saved_objects: [
        {
          id: 'some-id',
          type: 'unknown-type',
          attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
          score: 1,
          references: [],
        },
        {
          id: 'some-id-2',
          type: 'unknown-type',
          attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
          score: 1,
          references: [],
        },
      ],
      total: 2,
      per_page: 2,
      page: 1,
    };

    mockBaseClient.find.mockResolvedValue(mockedResponse);

    const options = { type: 'unknown-type', search: 'query' };
    await expect(wrapper.find(options)).resolves.toEqual({
      ...mockedResponse,
      saved_objects: [
        {
          ...mockedResponse.saved_objects[0],
          attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
        },
        {
          ...mockedResponse.saved_objects[1],
          attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
        },
      ],
    });
    expect(mockBaseClient.find).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.find).toHaveBeenCalledWith(options);
  });

  it('redirects request to underlying base client and strips encrypted attributes except for ones with `dangerouslyExposeValue` set to `true` if type is registered', async () => {
    const mockedResponse = {
      saved_objects: [
        {
          id: 'some-id',
          type: 'unknown-type',
          attributes: {
            attrOne: 'one',
            attrSecret: 'secret',
            attrNotSoSecret: 'not-so-secret',
            attrThree: 'three',
          },
          score: 1,
          references: [],
        },
        {
          id: 'some-id-2',
          type: 'known-type',
          attributes: {
            attrOne: 'one',
            attrSecret: '*secret*',
            attrNotSoSecret: '*not-so-secret*',
            attrThree: 'three',
          },
          score: 1,
          references: [],
        },
      ],
      total: 2,
      per_page: 2,
      page: 1,
    };

    mockBaseClient.find.mockResolvedValue(mockedResponse);

    const options = { type: ['unknown-type', 'known-type'], search: 'query' };
    await expect(wrapper.find(options)).resolves.toEqual({
      ...mockedResponse,
      saved_objects: [
        {
          ...mockedResponse.saved_objects[0],
          attributes: {
            attrOne: 'one',
            attrSecret: 'secret',
            attrNotSoSecret: 'not-so-secret',
            attrThree: 'three',
          },
        },
        {
          ...mockedResponse.saved_objects[1],
          attributes: { attrOne: 'one', attrNotSoSecret: 'not-so-secret', attrThree: 'three' },
        },
      ],
    });
    expect(mockBaseClient.find).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.find).toHaveBeenCalledWith(options);

    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledTimes(
      1
    );
    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'some-id-2' },
      {
        attrOne: 'one',
        attrSecret: '*secret*',
        attrNotSoSecret: '*not-so-secret*',
        attrThree: 'three',
      },
      undefined,
      { user: mockAuthenticatedUser() }
    );
  });

  it('includes both attributes and error if decryption fails.', async () => {
    const mockedResponse = {
      saved_objects: [
        {
          id: 'some-id',
          type: 'unknown-type',
          attributes: {
            attrOne: 'one',
            attrSecret: 'secret',
            attrNotSoSecret: 'not-so-secret',
            attrThree: 'three',
          },
          score: 1,
          references: [],
        },
        {
          id: 'some-id-2',
          type: 'known-type',
          attributes: {
            attrOne: 'one',
            attrSecret: '*secret*',
            attrNotSoSecret: '*not-so-secret*',
            attrThree: 'three',
          },
          score: 1,
          references: [],
        },
      ],
      total: 2,
      per_page: 2,
      page: 1,
    };

    mockBaseClient.find.mockResolvedValue(mockedResponse);

    const decryptionError = new EncryptionError(
      'something failed',
      'attrNotSoSecret',
      EncryptionErrorOperation.Decryption
    );
    encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes.mockResolvedValue({
      attributes: { attrOne: 'one', attrThree: 'three' },
      error: decryptionError,
    });

    const options = { type: ['unknown-type', 'known-type'], search: 'query' };
    await expect(wrapper.find(options)).resolves.toEqual({
      ...mockedResponse,
      saved_objects: [
        {
          ...mockedResponse.saved_objects[0],
          attributes: {
            attrOne: 'one',
            attrSecret: 'secret',
            attrNotSoSecret: 'not-so-secret',
            attrThree: 'three',
          },
        },
        {
          ...mockedResponse.saved_objects[1],
          attributes: { attrOne: 'one', attrThree: 'three' },
          error: decryptionError,
        },
      ],
    });
    expect(mockBaseClient.find).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.find).toHaveBeenCalledWith(options);

    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledTimes(
      1
    );
    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'some-id-2' },
      {
        attrOne: 'one',
        attrSecret: '*secret*',
        attrNotSoSecret: '*not-so-secret*',
        attrThree: 'three',
      },
      undefined,
      { user: mockAuthenticatedUser() }
    );
  });

  it('fails if base client fails', async () => {
    const failureReason = new Error('Something bad happened...');
    mockBaseClient.find.mockRejectedValue(failureReason);

    await expect(wrapper.find({ type: 'known-type' })).rejects.toThrowError(failureReason);

    expect(mockBaseClient.find).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.find).toHaveBeenCalledWith({ type: 'known-type' });
  });
});

describe('#bulkGet', () => {
  it('redirects request to underlying base client and does not alter response if type is not registered', async () => {
    const mockedResponse = {
      saved_objects: [
        {
          id: 'some-id',
          type: 'unknown-type',
          attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
          references: [],
        },
        {
          id: 'some-id-2',
          type: 'unknown-type',
          attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
          references: [],
        },
      ],
      total: 2,
      per_page: 2,
      page: 1,
    };

    mockBaseClient.bulkGet.mockResolvedValue(mockedResponse);

    const bulkGetParams = [
      { type: 'unknown-type', id: 'some-id' },
      { type: 'unknown-type', id: 'some-id-2' },
    ];

    const options = { namespace: 'some-ns' };
    await expect(wrapper.bulkGet(bulkGetParams, options)).resolves.toEqual({
      ...mockedResponse,
      saved_objects: [
        {
          ...mockedResponse.saved_objects[0],
          attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
        },
        {
          ...mockedResponse.saved_objects[1],
          attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
        },
      ],
    });
    expect(mockBaseClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.bulkGet).toHaveBeenCalledWith(bulkGetParams, options);
  });

  it('redirects request to underlying base client and strips encrypted attributes except for ones with `dangerouslyExposeValue` set to `true` if type is registered', async () => {
    const mockedResponse = {
      saved_objects: [
        {
          id: 'some-id',
          type: 'unknown-type',
          attributes: {
            attrOne: 'one',
            attrSecret: 'secret',
            attrNotSoSecret: 'not-so-secret',
            attrThree: 'three',
          },
          namespaces: ['some-ns'],
          references: [],
        },
        {
          id: 'some-id-2',
          type: 'known-type',
          attributes: {
            attrOne: 'one',
            attrSecret: '*secret*',
            attrNotSoSecret: '*not-so-secret*',
            attrThree: 'three',
          },
          namespaces: ['some-ns'],
          references: [],
        },
      ],
      total: 2,
      per_page: 2,
      page: 1,
    };

    mockBaseClient.bulkGet.mockResolvedValue(mockedResponse);

    const bulkGetParams = [
      { type: 'unknown-type', id: 'some-id' },
      { type: 'known-type', id: 'some-id-2' },
    ];

    const options = { namespace: 'some-ns' };
    await expect(wrapper.bulkGet(bulkGetParams, options)).resolves.toEqual({
      ...mockedResponse,
      saved_objects: [
        {
          ...mockedResponse.saved_objects[0],
          attributes: {
            attrOne: 'one',
            attrSecret: 'secret',
            attrNotSoSecret: 'not-so-secret',
            attrThree: 'three',
          },
        },
        {
          ...mockedResponse.saved_objects[1],
          attributes: { attrOne: 'one', attrNotSoSecret: 'not-so-secret', attrThree: 'three' },
        },
      ],
    });
    expect(mockBaseClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.bulkGet).toHaveBeenCalledWith(bulkGetParams, options);

    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledTimes(
      1
    );
    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'some-id-2', namespace: 'some-ns' },
      {
        attrOne: 'one',
        attrSecret: '*secret*',
        attrNotSoSecret: '*not-so-secret*',
        attrThree: 'three',
      },
      undefined,
      { user: mockAuthenticatedUser() }
    );
  });

  it('includes both attributes and error if decryption fails.', async () => {
    const mockedResponse = {
      saved_objects: [
        {
          id: 'some-id',
          type: 'unknown-type',
          attributes: {
            attrOne: 'one',
            attrSecret: 'secret',
            attrNotSoSecret: 'not-so-secret',
            attrThree: 'three',
          },
          namespaces: ['some-ns'],
          references: [],
        },
        {
          id: 'some-id-2',
          type: 'known-type',
          attributes: {
            attrOne: 'one',
            attrSecret: '*secret*',
            attrNotSoSecret: '*not-so-secret*',
            attrThree: 'three',
          },
          namespaces: ['some-ns'],
          references: [],
        },
      ],
      total: 2,
      per_page: 2,
      page: 1,
    };

    mockBaseClient.bulkGet.mockResolvedValue(mockedResponse);

    const decryptionError = new EncryptionError(
      'something failed',
      'attrNotSoSecret',
      EncryptionErrorOperation.Decryption
    );
    encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes.mockResolvedValue({
      attributes: { attrOne: 'one', attrThree: 'three' },
      error: decryptionError,
    });

    const bulkGetParams = [
      { type: 'unknown-type', id: 'some-id' },
      { type: 'known-type', id: 'some-id-2' },
    ];

    const options = { namespace: 'some-ns' };
    await expect(wrapper.bulkGet(bulkGetParams, options)).resolves.toEqual({
      ...mockedResponse,
      saved_objects: [
        {
          ...mockedResponse.saved_objects[0],
          attributes: {
            attrOne: 'one',
            attrSecret: 'secret',
            attrNotSoSecret: 'not-so-secret',
            attrThree: 'three',
          },
        },
        {
          ...mockedResponse.saved_objects[1],
          attributes: { attrOne: 'one', attrThree: 'three' },
          error: decryptionError,
        },
      ],
    });
    expect(mockBaseClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.bulkGet).toHaveBeenCalledWith(bulkGetParams, options);

    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledTimes(
      1
    );
    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'some-id-2', namespace: 'some-ns' },
      {
        attrOne: 'one',
        attrSecret: '*secret*',
        attrNotSoSecret: '*not-so-secret*',
        attrThree: 'three',
      },
      undefined,
      { user: mockAuthenticatedUser() }
    );
  });

  it('fails if base client fails', async () => {
    const failureReason = new Error('Something bad happened...');
    mockBaseClient.bulkGet.mockRejectedValue(failureReason);

    await expect(wrapper.bulkGet([{ type: 'known-type', id: 'some-id' }])).rejects.toThrowError(
      failureReason
    );

    expect(mockBaseClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.bulkGet).toHaveBeenCalledWith(
      [{ type: 'known-type', id: 'some-id' }],
      undefined
    );
  });

  it('redirects request to underlying base client and return errors result if type is registered', async () => {
    const mockedResponse = {
      saved_objects: [
        {
          id: 'bad',
          type: 'known-type',
          error: { statusCode: 404, message: 'Not found' },
        },
      ],
      total: 1,
      per_page: 1,
      page: 1,
    };
    mockBaseClient.bulkGet.mockResolvedValue(mockedResponse as any);
    const bulkGetParams = [{ type: 'known-type', id: 'bad' }];

    const options = { namespace: 'some-ns' };
    await expect(wrapper.bulkGet(bulkGetParams, options)).resolves.toEqual({
      ...mockedResponse,
      saved_objects: [{ ...mockedResponse.saved_objects[0] }],
    });
    expect(mockBaseClient.bulkGet).toHaveBeenCalledTimes(1);
  });
});

describe('#get', () => {
  it('redirects request to underlying base client and does not alter response if type is not registered', async () => {
    const mockedResponse = {
      id: 'some-id',
      type: 'unknown-type',
      attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
      references: [],
    };

    mockBaseClient.get.mockResolvedValue(mockedResponse);

    const options = { namespace: 'some-ns' };
    await expect(wrapper.get('unknown-type', 'some-id', options)).resolves.toEqual({
      ...mockedResponse,
      attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
    });
    expect(mockBaseClient.get).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.get).toHaveBeenCalledWith('unknown-type', 'some-id', options);
  });

  it('redirects request to underlying base client and strips encrypted attributes except for ones with `dangerouslyExposeValue` set to `true` if type is registered', async () => {
    const mockedResponse = {
      id: 'some-id',
      type: 'known-type',
      attributes: {
        attrOne: 'one',
        attrSecret: '*secret*',
        attrNotSoSecret: '*not-so-secret*',
        attrThree: 'three',
      },
      references: [],
    };

    mockBaseClient.get.mockResolvedValue(mockedResponse);

    const options = { namespace: 'some-ns' };
    await expect(wrapper.get('known-type', 'some-id', options)).resolves.toEqual({
      ...mockedResponse,
      attributes: { attrOne: 'one', attrNotSoSecret: 'not-so-secret', attrThree: 'three' },
    });
    expect(mockBaseClient.get).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.get).toHaveBeenCalledWith('known-type', 'some-id', options);

    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledTimes(
      1
    );
    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'some-id', namespace: 'some-ns' },
      {
        attrOne: 'one',
        attrSecret: '*secret*',
        attrNotSoSecret: '*not-so-secret*',
        attrThree: 'three',
      },
      undefined,
      { user: mockAuthenticatedUser() }
    );
  });

  it('includes both attributes and error if decryption fails.', async () => {
    const mockedResponse = {
      id: 'some-id',
      type: 'known-type',
      attributes: {
        attrOne: 'one',
        attrSecret: '*secret*',
        attrNotSoSecret: '*not-so-secret*',
        attrThree: 'three',
      },
      references: [],
    };

    mockBaseClient.get.mockResolvedValue(mockedResponse);

    const decryptionError = new EncryptionError(
      'something failed',
      'attrNotSoSecret',
      EncryptionErrorOperation.Decryption
    );
    encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes.mockResolvedValue({
      attributes: { attrOne: 'one', attrThree: 'three' },
      error: decryptionError,
    });

    const options = { namespace: 'some-ns' };
    await expect(wrapper.get('known-type', 'some-id', options)).resolves.toEqual({
      ...mockedResponse,
      attributes: { attrOne: 'one', attrThree: 'three' },
      error: decryptionError,
    });
    expect(mockBaseClient.get).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.get).toHaveBeenCalledWith('known-type', 'some-id', options);

    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledTimes(
      1
    );
    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'some-id', namespace: 'some-ns' },
      {
        attrOne: 'one',
        attrSecret: '*secret*',
        attrNotSoSecret: '*not-so-secret*',
        attrThree: 'three',
      },
      undefined,
      { user: mockAuthenticatedUser() }
    );
  });

  it('fails if base client fails', async () => {
    const failureReason = new Error('Something bad happened...');
    mockBaseClient.get.mockRejectedValue(failureReason);

    await expect(wrapper.get('known-type', 'some-id')).rejects.toThrowError(failureReason);

    expect(mockBaseClient.get).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.get).toHaveBeenCalledWith('known-type', 'some-id', undefined);
  });
});

describe('#bulkResolve', () => {
  it('redirects request to underlying base client and does not alter response if type is not registered', async () => {
    const mockedResponse = {
      resolved_objects: [
        {
          saved_object: {
            id: 'some-id',
            type: 'unknown-type',
            attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
            references: [],
          },
        },
        {
          saved_object: {
            id: 'some-id-2',
            type: 'unknown-type',
            attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
            references: [],
          },
        },
      ],
    };

    mockBaseClient.bulkResolve.mockResolvedValue(
      mockedResponse as unknown as SavedObjectsBulkResolveResponse
    );

    const bulkResolveParams = [
      { type: 'unknown-type', id: 'some-id' },
      { type: 'unknown-type', id: 'some-id-2' },
    ];

    const options = { namespace: 'some-ns' };
    await expect(wrapper.bulkResolve(bulkResolveParams, options)).resolves.toEqual(mockedResponse);
    expect(mockBaseClient.bulkResolve).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.bulkResolve).toHaveBeenCalledWith(bulkResolveParams, options);
  });

  it('redirects request to underlying base client and strips encrypted attributes except for ones with `dangerouslyExposeValue` set to `true` if type is registered', async () => {
    const mockedResponse = {
      resolved_objects: [
        {
          saved_object: {
            id: 'some-id',
            type: 'unknown-type',
            attributes: {
              attrOne: 'one',
              attrSecret: 'secret',
              attrNotSoSecret: 'not-so-secret',
              attrThree: 'three',
            },
            namespaces: ['some-ns'],
            references: [],
          },
        },
        {
          saved_object: {
            id: 'some-id-2',
            type: 'known-type',
            attributes: {
              attrOne: 'one',
              attrSecret: '*secret*',
              attrNotSoSecret: '*not-so-secret*',
              attrThree: 'three',
            },
            namespaces: ['some-ns'],
            references: [],
          },
        },
      ],
    };

    mockBaseClient.bulkResolve.mockResolvedValue(
      mockedResponse as unknown as SavedObjectsBulkResolveResponse
    );

    const bulkResolveParams = [
      { type: 'unknown-type', id: 'some-id' },
      { type: 'known-type', id: 'some-id-2' },
    ];

    const options = { namespace: 'some-ns' };
    await expect(wrapper.bulkResolve(bulkResolveParams, options)).resolves.toEqual({
      resolved_objects: [
        mockedResponse.resolved_objects[0],
        {
          saved_object: {
            ...mockedResponse.resolved_objects[1].saved_object,
            attributes: { attrOne: 'one', attrNotSoSecret: 'not-so-secret', attrThree: 'three' },
          },
        },
      ],
    });
    expect(mockBaseClient.bulkResolve).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.bulkResolve).toHaveBeenCalledWith(bulkResolveParams, options);

    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledTimes(
      1
    );
    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'some-id-2', namespace: 'some-ns' },
      {
        attrOne: 'one',
        attrSecret: '*secret*',
        attrNotSoSecret: '*not-so-secret*',
        attrThree: 'three',
      },
      undefined,
      { user: mockAuthenticatedUser() }
    );
  });

  it('includes both attributes and error if decryption fails.', async () => {
    const mockedResponse = {
      resolved_objects: [
        {
          saved_object: {
            id: 'some-id',
            type: 'unknown-type',
            attributes: {
              attrOne: 'one',
              attrSecret: 'secret',
              attrNotSoSecret: 'not-so-secret',
              attrThree: 'three',
            },
            namespaces: ['some-ns'],
            references: [],
          },
        },
        {
          saved_object: {
            id: 'some-id-2',
            type: 'known-type',
            attributes: {
              attrOne: 'one',
              attrSecret: '*secret*',
              attrNotSoSecret: '*not-so-secret*',
              attrThree: 'three',
            },
            namespaces: ['some-ns'],
            references: [],
          },
        },
      ],
    };

    mockBaseClient.bulkResolve.mockResolvedValue(
      mockedResponse as unknown as SavedObjectsBulkResolveResponse
    );

    const decryptionError = new EncryptionError(
      'something failed',
      'attrNotSoSecret',
      EncryptionErrorOperation.Decryption
    );
    encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes.mockResolvedValue({
      attributes: { attrOne: 'one', attrThree: 'three' },
      error: decryptionError,
    });

    const bulkResolveParams = [
      { type: 'unknown-type', id: 'some-id' },
      { type: 'known-type', id: 'some-id-2' },
    ];

    const options = { namespace: 'some-ns' };
    await expect(wrapper.bulkResolve(bulkResolveParams, options)).resolves.toEqual({
      resolved_objects: [
        mockedResponse.resolved_objects[0],
        {
          saved_object: {
            ...mockedResponse.resolved_objects[1].saved_object,
            attributes: { attrOne: 'one', attrThree: 'three' },
            error: decryptionError,
          },
        },
      ],
    });
    expect(mockBaseClient.bulkResolve).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.bulkResolve).toHaveBeenCalledWith(bulkResolveParams, options);

    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledTimes(
      1
    );
    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'some-id-2', namespace: 'some-ns' },
      {
        attrOne: 'one',
        attrSecret: '*secret*',
        attrNotSoSecret: '*not-so-secret*',
        attrThree: 'three',
      },
      undefined,
      { user: mockAuthenticatedUser() }
    );
  });

  it('fails if base client fails', async () => {
    const failureReason = new Error('Something bad happened...');
    mockBaseClient.bulkResolve.mockRejectedValue(failureReason);

    await expect(wrapper.bulkResolve([{ type: 'known-type', id: 'some-id' }])).rejects.toThrowError(
      failureReason
    );

    expect(mockBaseClient.bulkResolve).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.bulkResolve).toHaveBeenCalledWith(
      [{ type: 'known-type', id: 'some-id' }],
      undefined
    );
  });

  it('redirects request to underlying base client and return errors result if type is registered', async () => {
    const mockedResponse = {
      resolved_objects: [
        {
          saved_object: {
            id: 'bad',
            type: 'known-type',
            error: { statusCode: 404, message: 'Not found' },
          },
        },
      ],
    };
    mockBaseClient.bulkResolve.mockResolvedValue(
      mockedResponse as unknown as SavedObjectsBulkResolveResponse
    );
    const bulkGetParams = [{ type: 'known-type', id: 'bad' }];

    const options = { namespace: 'some-ns' };
    await expect(wrapper.bulkResolve(bulkGetParams, options)).resolves.toEqual(mockedResponse);
    expect(mockBaseClient.bulkResolve).toHaveBeenCalledTimes(1);
  });
});

describe('#resolve', () => {
  it('redirects request to underlying base client and does not alter response if type is not registered', async () => {
    const mockedResponse = {
      saved_object: {
        id: 'some-id',
        type: 'unknown-type',
        attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
        references: [],
      },
      outcome: 'exactMatch' as 'exactMatch',
    };

    mockBaseClient.resolve.mockResolvedValue(mockedResponse);

    const options = { namespace: 'some-ns' };
    await expect(wrapper.resolve('unknown-type', 'some-id', options)).resolves.toEqual(
      mockedResponse
    );
    expect(mockBaseClient.resolve).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.resolve).toHaveBeenCalledWith('unknown-type', 'some-id', options);
  });

  it('redirects request to underlying base client and strips encrypted attributes except for ones with `dangerouslyExposeValue` set to `true` if type is registered', async () => {
    const mockedResponse = {
      saved_object: {
        id: 'some-id',
        type: 'known-type',
        attributes: {
          attrOne: 'one',
          attrSecret: '*secret*',
          attrNotSoSecret: '*not-so-secret*',
          attrThree: 'three',
        },
        references: [],
      },
      outcome: 'exactMatch' as 'exactMatch',
    };

    mockBaseClient.resolve.mockResolvedValue(mockedResponse);

    const options = { namespace: 'some-ns' };
    await expect(wrapper.resolve('known-type', 'some-id', options)).resolves.toEqual({
      ...mockedResponse,
      saved_object: {
        ...mockedResponse.saved_object,
        attributes: { attrOne: 'one', attrNotSoSecret: 'not-so-secret', attrThree: 'three' },
      },
    });
    expect(mockBaseClient.resolve).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.resolve).toHaveBeenCalledWith('known-type', 'some-id', options);

    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledTimes(
      1
    );
    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'some-id', namespace: 'some-ns' },
      {
        attrOne: 'one',
        attrSecret: '*secret*',
        attrNotSoSecret: '*not-so-secret*',
        attrThree: 'three',
      },
      undefined,
      { user: mockAuthenticatedUser() }
    );
  });

  it('includes both attributes and error with modified outcome if decryption fails.', async () => {
    const mockedResponse = {
      saved_object: {
        id: 'some-id',
        type: 'known-type',
        attributes: {
          attrOne: 'one',
          attrSecret: '*secret*',
          attrNotSoSecret: '*not-so-secret*',
          attrThree: 'three',
        },
        references: [],
      },
      outcome: 'exactMatch' as 'exactMatch',
    };

    mockBaseClient.resolve.mockResolvedValue(mockedResponse);

    const decryptionError = new EncryptionError(
      'something failed',
      'attrNotSoSecret',
      EncryptionErrorOperation.Decryption
    );
    encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes.mockResolvedValue({
      attributes: { attrOne: 'one', attrThree: 'three' },
      error: decryptionError,
    });

    const options = { namespace: 'some-ns' };
    await expect(wrapper.resolve('known-type', 'some-id', options)).resolves.toEqual({
      ...mockedResponse,
      saved_object: {
        ...mockedResponse.saved_object,
        attributes: { attrOne: 'one', attrThree: 'three' },
        error: decryptionError,
      },
    });
    expect(mockBaseClient.resolve).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.resolve).toHaveBeenCalledWith('known-type', 'some-id', options);

    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledTimes(
      1
    );
    expect(encryptedSavedObjectsServiceMockInstance.stripOrDecryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'some-id', namespace: 'some-ns' },
      {
        attrOne: 'one',
        attrSecret: '*secret*',
        attrNotSoSecret: '*not-so-secret*',
        attrThree: 'three',
      },
      undefined,
      { user: mockAuthenticatedUser() }
    );
  });

  it('fails if base client fails', async () => {
    const failureReason = new Error('Something bad happened...');
    mockBaseClient.resolve.mockRejectedValue(failureReason);

    await expect(wrapper.resolve('known-type', 'some-id')).rejects.toThrowError(failureReason);

    expect(mockBaseClient.resolve).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.resolve).toHaveBeenCalledWith('known-type', 'some-id', undefined);
  });
});

describe('#update', () => {
  it('redirects request to underlying base client if type is not registered', async () => {
    const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };
    const options = { version: 'some-version' };
    const mockedResponse = { id: 'some-id', type: 'unknown-type', attributes, references: [] };

    mockBaseClient.update.mockResolvedValue(mockedResponse);

    await expect(wrapper.update('unknown-type', 'some-id', attributes, options)).resolves.toEqual({
      ...mockedResponse,
      attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
    });
    expect(mockBaseClient.update).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.update).toHaveBeenCalledWith(
      'unknown-type',
      'some-id',
      attributes,
      options
    );
  });

  it('encrypts attributes and strips them from response except for ones with `dangerouslyExposeValue` set to `true`', async () => {
    const attributes = {
      attrOne: 'one',
      attrSecret: 'secret',
      attrNotSoSecret: 'not-so-secret',
      attrThree: 'three',
    };
    const options = { version: 'some-version' };
    const mockedResponse = {
      id: 'some-id',
      type: 'known-type',
      attributes: {
        ...attributes,
        attrSecret: `*${attributes.attrSecret}*`,
        attrNotSoSecret: `*${attributes.attrNotSoSecret}*`,
      },
      references: [],
    };

    mockBaseClient.update.mockResolvedValue(mockedResponse);

    await expect(wrapper.update('known-type', 'some-id', attributes, options)).resolves.toEqual({
      ...mockedResponse,
      attributes: { attrOne: 'one', attrNotSoSecret: 'not-so-secret', attrThree: 'three' },
    });

    expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledTimes(1);
    expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'some-id' },
      {
        attrOne: 'one',
        attrSecret: 'secret',
        attrNotSoSecret: 'not-so-secret',
        attrThree: 'three',
      },
      { user: mockAuthenticatedUser() }
    );

    expect(mockBaseClient.update).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.update).toHaveBeenCalledWith(
      'known-type',
      'some-id',
      {
        attrOne: 'one',
        attrSecret: '*secret*',
        attrNotSoSecret: '*not-so-secret*',
        attrThree: 'three',
      },
      options
    );
  });

  describe('namespace', () => {
    const doTest = async (namespace: string, expectNamespaceInDescriptor: boolean) => {
      const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };
      const options = { version: 'some-version', namespace };
      const mockedResponse = { id: 'some-id', type: 'known-type', attributes, references: [] };

      mockBaseClient.update.mockResolvedValue(mockedResponse);

      await expect(wrapper.update('known-type', 'some-id', attributes, options)).resolves.toEqual({
        ...mockedResponse,
        attributes: { attrOne: 'one', attrThree: 'three' },
      });

      expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledTimes(1);
      expect(encryptedSavedObjectsServiceMockInstance.encryptAttributes).toHaveBeenCalledWith(
        {
          type: 'known-type',
          id: 'some-id',
          namespace: expectNamespaceInDescriptor ? namespace : undefined,
        },
        { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
        { user: mockAuthenticatedUser() }
      );

      expect(mockBaseClient.update).toHaveBeenCalledTimes(1);
      expect(mockBaseClient.update).toHaveBeenCalledWith(
        'known-type',
        'some-id',
        { attrOne: 'one', attrSecret: '*secret*', attrThree: 'three' },
        options
      );
    };

    it('uses `namespace` to encrypt attributes if it is specified when type is single-namespace', async () => {
      await doTest('some-namespace', true);
    });

    it('does not use `namespace` to encrypt attributes if it is specified when type is not single-namespace', async () => {
      mockBaseTypeRegistry.isSingleNamespace.mockReturnValue(false);
      await doTest('some-namespace', false);
    });
  });

  it('fails if base client fails', async () => {
    const failureReason = new Error('Something bad happened...');
    mockBaseClient.update.mockRejectedValue(failureReason);

    await expect(
      wrapper.update('known-type', 'some-id', {
        attrOne: 'one',
        attrSecret: 'secret',
        attrThree: 'three',
      })
    ).rejects.toThrowError(failureReason);

    expect(mockBaseClient.update).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.update).toHaveBeenCalledWith(
      'known-type',
      'some-id',
      { attrOne: 'one', attrSecret: '*secret*', attrThree: 'three' },
      undefined
    );
  });
});

describe('#removeReferencesTo', () => {
  it('redirects request to underlying base client', async () => {
    const options = { namespace: 'some-ns' };

    await wrapper.removeReferencesTo('some-type', 'some-id', options);

    expect(mockBaseClient.removeReferencesTo).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.removeReferencesTo).toHaveBeenCalledWith('some-type', 'some-id', options);
  });

  it('returns response from underlying client', async () => {
    const returnValue = {
      updated: 12,
    };
    mockBaseClient.removeReferencesTo.mockResolvedValue(returnValue);

    const result = await wrapper.removeReferencesTo('known-type', 'some-id');

    expect(result).toBe(returnValue);
  });

  it('fails if base client fails', async () => {
    const failureReason = new Error('Something bad happened...');
    mockBaseClient.removeReferencesTo.mockRejectedValue(failureReason);

    await expect(wrapper.removeReferencesTo('known-type', 'some-id')).rejects.toThrowError(
      failureReason
    );

    expect(mockBaseClient.removeReferencesTo).toHaveBeenCalledTimes(1);
  });
});

describe('#openPointInTimeForType', () => {
  it('redirects request to underlying base client', async () => {
    const options = { keepAlive: '1m' };

    await wrapper.openPointInTimeForType('some-type', options);

    expect(mockBaseClient.openPointInTimeForType).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.openPointInTimeForType).toHaveBeenCalledWith('some-type', options);
  });

  it('returns response from underlying client', async () => {
    const returnValue = {
      id: 'abc123',
    };
    mockBaseClient.openPointInTimeForType.mockResolvedValue(returnValue);

    const result = await wrapper.openPointInTimeForType('known-type');

    expect(result).toBe(returnValue);
  });

  it('fails if base client fails', async () => {
    const failureReason = new Error('Something bad happened...');
    mockBaseClient.openPointInTimeForType.mockRejectedValue(failureReason);

    await expect(wrapper.openPointInTimeForType('known-type')).rejects.toThrowError(failureReason);

    expect(mockBaseClient.openPointInTimeForType).toHaveBeenCalledTimes(1);
  });
});

describe('#closePointInTime', () => {
  it('redirects request to underlying base client', async () => {
    const id = 'abc123';
    await wrapper.closePointInTime(id);

    expect(mockBaseClient.closePointInTime).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.closePointInTime).toHaveBeenCalledWith(id, undefined);
  });

  it('returns response from underlying client', async () => {
    const returnValue = {
      succeeded: true,
      num_freed: 1,
    };
    mockBaseClient.closePointInTime.mockResolvedValue(returnValue);

    const result = await wrapper.closePointInTime('abc123');

    expect(result).toBe(returnValue);
  });

  it('fails if base client fails', async () => {
    const failureReason = new Error('Something bad happened...');
    mockBaseClient.closePointInTime.mockRejectedValue(failureReason);

    await expect(wrapper.closePointInTime('abc123')).rejects.toThrowError(failureReason);

    expect(mockBaseClient.closePointInTime).toHaveBeenCalledTimes(1);
  });

  describe('#collectMultiNamespaceReferences', () => {
    it('redirects request to underlying base client', async () => {
      const objects = [{ type: 'foo', id: 'bar' }];
      const options = { namespace: 'some-ns' };
      await wrapper.collectMultiNamespaceReferences(objects, options);

      expect(mockBaseClient.collectMultiNamespaceReferences).toHaveBeenCalledTimes(1);
      expect(mockBaseClient.collectMultiNamespaceReferences).toHaveBeenCalledWith(objects, options);
    });

    it('returns response from underlying client', async () => {
      const returnValue = { objects: [] };
      mockBaseClient.collectMultiNamespaceReferences.mockResolvedValue(returnValue);

      const objects = [{ type: 'foo', id: 'bar' }];
      const result = await wrapper.collectMultiNamespaceReferences(objects);

      expect(result).toBe(returnValue);
    });

    it('fails if base client fails', async () => {
      const failureReason = new Error('Something bad happened...');
      mockBaseClient.collectMultiNamespaceReferences.mockRejectedValue(failureReason);

      const objects = [{ type: 'foo', id: 'bar' }];
      await expect(wrapper.collectMultiNamespaceReferences(objects)).rejects.toThrowError(
        failureReason
      );

      expect(mockBaseClient.collectMultiNamespaceReferences).toHaveBeenCalledTimes(1);
    });
  });

  describe('#updateObjectsSpaces', () => {
    const objects = [{ type: 'foo', id: 'bar' }];
    const spacesToAdd = ['space-x'];
    const spacesToRemove = ['space-y'];
    const options = {};
    it('redirects request to underlying base client', async () => {
      await wrapper.updateObjectsSpaces(objects, spacesToAdd, spacesToRemove, options);

      expect(mockBaseClient.updateObjectsSpaces).toHaveBeenCalledTimes(1);
      expect(mockBaseClient.updateObjectsSpaces).toHaveBeenCalledWith(
        objects,
        spacesToAdd,
        spacesToRemove,
        options
      );
    });

    it('returns response from underlying client', async () => {
      const returnValue = { objects: [] };
      mockBaseClient.updateObjectsSpaces.mockResolvedValue(returnValue);

      const result = await wrapper.updateObjectsSpaces(
        objects,
        spacesToAdd,
        spacesToRemove,
        options
      );

      expect(result).toBe(returnValue);
    });

    it('fails if base client fails', async () => {
      const failureReason = new Error('Something bad happened...');
      mockBaseClient.updateObjectsSpaces.mockRejectedValue(failureReason);

      await expect(
        wrapper.updateObjectsSpaces(objects, spacesToAdd, spacesToRemove, options)
      ).rejects.toThrowError(failureReason);

      expect(mockBaseClient.updateObjectsSpaces).toHaveBeenCalledTimes(1);
    });
  });
});

describe('#createPointInTimeFinder', () => {
  it('redirects request to underlying base client with default dependencies', () => {
    const options = { type: ['a', 'b'], search: 'query' };
    wrapper.createPointInTimeFinder(options);

    expect(mockBaseClient.createPointInTimeFinder).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.createPointInTimeFinder).toHaveBeenCalledWith(options, {
      client: wrapper,
    });
  });

  it('redirects request to underlying base client with custom dependencies', () => {
    const options = { type: ['a', 'b'], search: 'query' };
    const dependencies = {
      client: {
        find: jest.fn(),
        openPointInTimeForType: jest.fn(),
        closePointInTime: jest.fn(),
      },
    };
    wrapper.createPointInTimeFinder(options, dependencies);

    expect(mockBaseClient.createPointInTimeFinder).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.createPointInTimeFinder).toHaveBeenCalledWith(options, dependencies);
  });
});
