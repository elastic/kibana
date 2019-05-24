/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('uuid-v4-id') }));

import { EncryptedSavedObjectsClientWrapper } from './encrypted_saved_objects_client_wrapper';
import { EncryptedSavedObjectsService } from './encrypted_saved_objects_service';
import { createEncryptedSavedObjectsServiceMock } from './encrypted_saved_objects_service.mock';
import { SavedObjectsClientMock } from '../../../../../src/legacy/server/saved_objects/service/saved_objects_client.mock';
import { SavedObjectsClientContract } from 'src/legacy/server/saved_objects';

let wrapper: EncryptedSavedObjectsClientWrapper;
let mockBaseClient: jest.Mocked<SavedObjectsClientContract>;
let encryptedSavedObjectsServiceMock: jest.Mocked<EncryptedSavedObjectsService>;
beforeEach(() => {
  mockBaseClient = SavedObjectsClientMock.create();
  encryptedSavedObjectsServiceMock = createEncryptedSavedObjectsServiceMock([
    {
      type: 'known-type',
      attributesToEncrypt: new Set(['attrSecret']),
    },
  ]);

  wrapper = new EncryptedSavedObjectsClientWrapper({
    service: encryptedSavedObjectsServiceMock,
    baseClient: mockBaseClient,
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

  it('generates ID, encrypts attributes and strips them from response', async () => {
    const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };
    const options = { overwrite: true };
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

    expect(encryptedSavedObjectsServiceMock.encryptAttributes).toHaveBeenCalledTimes(1);
    expect(encryptedSavedObjectsServiceMock.encryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'uuid-v4-id' },
      { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' }
    );

    expect(mockBaseClient.create).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.create).toHaveBeenCalledWith(
      'known-type',
      { attrOne: 'one', attrSecret: '*secret*', attrThree: 'three' },
      { id: 'uuid-v4-id', overwrite: true }
    );
  });

  it('uses `namespace` to encrypt attributes if it is specified', async () => {
    const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };
    const options = { overwrite: true, namespace: 'some-namespace' };
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

    expect(encryptedSavedObjectsServiceMock.encryptAttributes).toHaveBeenCalledTimes(1);
    expect(encryptedSavedObjectsServiceMock.encryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'uuid-v4-id', namespace: 'some-namespace' },
      { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' }
    );

    expect(mockBaseClient.create).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.create).toHaveBeenCalledWith(
      'known-type',
      { attrOne: 'one', attrSecret: '*secret*', attrThree: 'three' },
      { id: 'uuid-v4-id', overwrite: true, namespace: 'some-namespace' }
    );
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
    const options = { namespace: 'some-namespace' };

    const bulkCreateParams = [
      { id: 'some-id', type: 'known-type', attributes },
      { type: 'unknown-type', attributes },
    ];

    await expect(wrapper.bulkCreate(bulkCreateParams, options)).rejects.toThrowError(
      'Predefined IDs are not allowed for saved objects with encrypted attributes.'
    );

    expect(mockBaseClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('generates ID, encrypts attributes and strips them from response', async () => {
    const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };
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
      { type: 'unknown-type', attributes },
    ];

    await expect(wrapper.bulkCreate(bulkCreateParams)).resolves.toEqual({
      saved_objects: [
        { ...mockedResponse.saved_objects[0], attributes: { attrOne: 'one', attrThree: 'three' } },
        mockedResponse.saved_objects[1],
      ],
    });

    expect(encryptedSavedObjectsServiceMock.encryptAttributes).toHaveBeenCalledTimes(1);
    expect(encryptedSavedObjectsServiceMock.encryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'uuid-v4-id' },
      { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' }
    );

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
      undefined
    );
  });

  it('uses `namespace` to encrypt attributes if it is specified', async () => {
    const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };
    const options = { namespace: 'some-namespace' };
    const mockedResponse = {
      saved_objects: [{ id: 'uuid-v4-id', type: 'known-type', attributes, references: [] }],
    };

    mockBaseClient.bulkCreate.mockResolvedValue(mockedResponse);

    const bulkCreateParams = [{ type: 'known-type', attributes }];
    await expect(wrapper.bulkCreate(bulkCreateParams, options)).resolves.toEqual({
      saved_objects: [
        { ...mockedResponse.saved_objects[0], attributes: { attrOne: 'one', attrThree: 'three' } },
      ],
    });

    expect(encryptedSavedObjectsServiceMock.encryptAttributes).toHaveBeenCalledTimes(1);
    expect(encryptedSavedObjectsServiceMock.encryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'uuid-v4-id', namespace: 'some-namespace' },
      { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' }
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

  it('redirects request to underlying base client and strips encrypted attributes if type is registered', async () => {
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
          type: 'known-type',
          attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
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
          attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
        },
        {
          ...mockedResponse.saved_objects[1],
          attributes: { attrOne: 'one', attrThree: 'three' },
        },
      ],
    });
    expect(mockBaseClient.find).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.find).toHaveBeenCalledWith(options);
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

  it('redirects request to underlying base client and strips encrypted attributes if type is registered', async () => {
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
          type: 'known-type',
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
      { type: 'known-type', id: 'some-id-2' },
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
          attributes: { attrOne: 'one', attrThree: 'three' },
        },
      ],
    });
    expect(mockBaseClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.bulkGet).toHaveBeenCalledWith(bulkGetParams, options);
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

  it('redirects request to underlying base client and strips encrypted attributes if type is registered', async () => {
    const mockedResponse = {
      id: 'some-id',
      type: 'known-type',
      attributes: { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' },
      references: [],
    };

    mockBaseClient.get.mockResolvedValue(mockedResponse);

    const options = { namespace: 'some-ns' };
    await expect(wrapper.get('known-type', 'some-id', options)).resolves.toEqual({
      ...mockedResponse,
      attributes: { attrOne: 'one', attrThree: 'three' },
    });
    expect(mockBaseClient.get).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.get).toHaveBeenCalledWith('known-type', 'some-id', options);
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

  it('encrypts attributes and strips them from response', async () => {
    const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };
    const options = { version: 'some-version' };
    const mockedResponse = { id: 'some-id', type: 'known-type', attributes, references: [] };

    mockBaseClient.update.mockResolvedValue(mockedResponse);

    await expect(wrapper.update('known-type', 'some-id', attributes, options)).resolves.toEqual({
      ...mockedResponse,
      attributes: { attrOne: 'one', attrThree: 'three' },
    });

    expect(encryptedSavedObjectsServiceMock.encryptAttributes).toHaveBeenCalledTimes(1);
    expect(encryptedSavedObjectsServiceMock.encryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'some-id' },
      { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' }
    );

    expect(mockBaseClient.update).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.update).toHaveBeenCalledWith(
      'known-type',
      'some-id',
      { attrOne: 'one', attrSecret: '*secret*', attrThree: 'three' },
      options
    );
  });

  it('uses `namespace` to encrypt attributes if it is specified', async () => {
    const attributes = { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' };
    const options = { version: 'some-version', namespace: 'some-namespace' };
    const mockedResponse = { id: 'some-id', type: 'known-type', attributes, references: [] };

    mockBaseClient.update.mockResolvedValue(mockedResponse);

    await expect(wrapper.update('known-type', 'some-id', attributes, options)).resolves.toEqual({
      ...mockedResponse,
      attributes: { attrOne: 'one', attrThree: 'three' },
    });

    expect(encryptedSavedObjectsServiceMock.encryptAttributes).toHaveBeenCalledTimes(1);
    expect(encryptedSavedObjectsServiceMock.encryptAttributes).toHaveBeenCalledWith(
      { type: 'known-type', id: 'some-id', namespace: 'some-namespace' },
      { attrOne: 'one', attrSecret: 'secret', attrThree: 'three' }
    );

    expect(mockBaseClient.update).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.update).toHaveBeenCalledWith(
      'known-type',
      'some-id',
      { attrOne: 'one', attrSecret: '*secret*', attrThree: 'three' },
      options
    );
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
