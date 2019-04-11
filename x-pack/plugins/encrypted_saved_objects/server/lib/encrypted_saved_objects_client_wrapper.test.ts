/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('uuid-v4-id') }));

import { EncryptedSavedObjectsClientWrapper } from './encrypted_saved_objects_client_wrapper';
import { encryptedSavedObjectsServiceMock } from './encrypted_saved_objects_service.mock';
import { SavedObjectsClient } from 'src/legacy/server/saved_objects/service/saved_objects_client';

function createSavedObjectsClientMock(): jest.Mocked<SavedObjectsClient> {
  return {
    errors: {} as any,
    bulkCreate: jest.fn(),
    bulkGet: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
  };
}

afterEach(() => jest.clearAllMocks());

describe('#create', () => {
  let wrapper: EncryptedSavedObjectsClientWrapper;
  let mockBaseClient: jest.Mocked<SavedObjectsClient>;
  beforeEach(() => {
    mockBaseClient = createSavedObjectsClientMock();

    wrapper = new EncryptedSavedObjectsClientWrapper({
      service: encryptedSavedObjectsServiceMock,
      baseClient: mockBaseClient,
    } as any);
  });

  it('redirects request to underlying base client if type not registered', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
    const options = { id: 'some-non-uuid-v4-id' };
    const mockedResponse = { id: options.id, type: 'some-type', attributes, references: [] };

    encryptedSavedObjectsServiceMock.isRegistered.mockReturnValue(false);
    mockBaseClient.create.mockResolvedValue(mockedResponse);

    const response = await wrapper.create('some-type', attributes, options);

    expect(response).toEqual({
      id: options.id,
      type: 'some-type',
      attributes,
      references: [],
    });
    expect(mockBaseClient.create).toHaveBeenCalledTimes(1);
    expect(mockBaseClient.create).toHaveBeenCalledWith('some-type', attributes, options);
  });

  it('fails if type is registered and ID is specified', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    encryptedSavedObjectsServiceMock.isRegistered.mockReturnValue(true);

    await expect(wrapper.create('some-type', attributes, { id: 'some--id' })).rejects.toThrowError(
      'Predefined IDs are not allowed for saved objects with encrypted attributes.'
    );

    expect(mockBaseClient.create).not.toHaveBeenCalled();
  });
});
