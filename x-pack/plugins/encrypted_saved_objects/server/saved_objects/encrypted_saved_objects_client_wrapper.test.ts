/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EncryptionErrorOperation } from '../crypto/encryption_error';
import { SavedObjectsClientContract } from 'src/core/server';
import { EncryptedSavedObjectsService, EncryptionError } from '../crypto';
import { EncryptedSavedObjectsClientWrapper } from './encrypted_saved_objects_client_wrapper';

import { savedObjectsClientMock, savedObjectsTypeRegistryMock } from 'src/core/server/mocks';
import { mockAuthenticatedUser } from '../../../security/common/model/authenticated_user.mock';
import { encryptedSavedObjectsServiceMock } from '../crypto/index.mock';

jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('uuid-v4-id') }));

let wrapper: EncryptedSavedObjectsClientWrapper;
let mockBaseClient: jest.Mocked<SavedObjectsClientContract>;
let mockBaseTypeRegistry: ReturnType<typeof savedObjectsTypeRegistryMock.create>;
let encryptedSavedObjectsServiceMockInstance: jest.Mocked<EncryptedSavedObjectsService>;
beforeEach(() => {
  mockBaseClient = savedObjectsClientMock.create();
  mockBaseTypeRegistry = savedObjectsTypeRegistryMock.create();
  encryptedSavedObjectsServiceMockInstance = encryptedSavedObjectsServiceMock.create([
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

  it('fails if type is registered and ID is specified', async () => {
    const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };

    await expect(wrapper.create('known-type', attributes, { id: 'some-id' })).rejects.toThrowError(
      'Predefined IDs are not allowed for saved objects with encrypted attributes.'
    );

    expect(mockBaseClient.create).not.toHaveBeenCalled();
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
      id: 'uuid-v4-id',
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
      { type: 'known-type', id: 'uuid-v4-id' },
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
      { id: 'uuid-v4-id', overwrite: true }
    );
  });

  describe('namespace', () => {
    const doTest = async (namespace: string, expectNamespaceInDescriptor: boolean) => {
      const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };
      const options = { overwrite: true, namespace };
      const mockedResponse = {
        id: 'uuid-v4-id',
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
          id: 'uuid-v4-id',
          namespace: expectNamespaceInDescriptor ? namespace : undefined,
        },
        { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
        { user: mockAuthenticatedUser() }
      );

      expect(mockBaseClient.create).toHaveBeenCalledTimes(1);
      expect(mockBaseClient.create).toHaveBeenCalledWith(
        'known-type',
        { attrOne: 'one', attrSecret: '*secret*', attrThree: 'three' },
        { id: 'uuid-v4-id', overwrite: true, namespace }
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
      { id: 'uuid-v4-id' }
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
          id: 'uuid-v4-id',
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
          id: 'uuid-v4-id',
          attributes: { attrOne: 'one', attrSecret: '*secret*', attrThree: 'three' },
        },
        bulkCreateParams[1],
      ],
      options
    );
  });

  it('fails if ID is specified for registered type', async () => {
    const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };

    const bulkCreateParams = [
      { id: 'some-id', type: 'known-type', attributes },
      { type: 'unknown-type', attributes },
    ];

    await expect(wrapper.bulkCreate(bulkCreateParams)).rejects.toThrowError(
      'Predefined IDs are not allowed for saved objects with encrypted attributes.'
    );

    expect(mockBaseClient.bulkCreate).not.toHaveBeenCalled();
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
          id: 'uuid-v4-id',
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
      { type: 'known-type', id: 'uuid-v4-id' },
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
          id: 'uuid-v4-id',
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
        saved_objects: [{ id: 'uuid-v4-id', type: 'known-type', attributes, references: [] }],
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
          id: 'uuid-v4-id',
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
            id: 'uuid-v4-id',
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
          id: 'uuid-v4-id',
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
      saved_objects: docs.map(doc => ({
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
        docs.map(doc => ({ ...doc })),
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
    const doTest = async (namespace: string, expectNamespaceInDescriptor: boolean) => {
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
        },
      ];
      const options = { namespace };

      mockBaseClient.bulkUpdate.mockResolvedValue({
        saved_objects: docs.map(doc => ({ ...doc, references: undefined })),
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
          namespace: expectNamespaceInDescriptor ? namespace : undefined,
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

            references: undefined,
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
