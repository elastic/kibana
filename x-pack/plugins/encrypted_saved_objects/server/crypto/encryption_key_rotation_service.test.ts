/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsClientMock,
  savedObjectsTypeRegistryMock,
} from '@kbn/core/server/mocks';

import type { EncryptedSavedObjectsService } from './encrypted_saved_objects_service';
import { EncryptionError, EncryptionErrorOperation } from './encryption_error';
import { EncryptionKeyRotationService } from './encryption_key_rotation_service';
import { encryptedSavedObjectsServiceMock } from './index.mock';

function getMockSavedObject(savedObject?: Partial<SavedObject<any>>) {
  const id = savedObject?.id ?? `id-1`;
  return {
    id,
    type: `type-${id}`,
    references: [],
    attributes: { attr: `attr-${id}` },
    score: 0,
    ...savedObject,
  };
}

let mockEncryptionService: jest.Mocked<EncryptedSavedObjectsService>;
let mockRetrieveClient: jest.Mocked<SavedObjectsClientContract>;
let mockUpdateClient: jest.Mocked<SavedObjectsClientContract>;
let mockSavedObjects: jest.Mocked<SavedObjectsServiceStart>;
let service: EncryptionKeyRotationService;
beforeEach(() => {
  mockEncryptionService = encryptedSavedObjectsServiceMock.create();
  mockEncryptionService.isRegistered.mockImplementation(
    (type) => type !== 'type-id-3' && type !== 'type-id-6'
  );
  mockEncryptionService.decryptAttributes.mockImplementation(async (descriptor, { attr }) => ({
    attr: `decrypted-${attr}`,
  }));

  const coreSetupMock = coreMock.createSetup();
  const coreStartMock = coreMock.createStart();
  coreSetupMock.getStartServices.mockResolvedValue([coreStartMock, {}, {}]);

  mockSavedObjects = coreStartMock.savedObjects;
  const typeRegistryMock = savedObjectsTypeRegistryMock.create();
  typeRegistryMock.getAllTypes.mockReturnValue([
    { name: 'type-id-1', namespaceType: 'single', mappings: { properties: {} }, hidden: false },
    { name: 'type-id-2', namespaceType: 'single', mappings: { properties: {} }, hidden: true },
    { name: 'type-id-3', namespaceType: 'single', mappings: { properties: {} }, hidden: false },
    { name: 'type-id-4', namespaceType: 'multiple', mappings: { properties: {} }, hidden: true },
    { name: 'type-id-5', namespaceType: 'single', mappings: { properties: {} }, hidden: false },
    { name: 'type-id-6', namespaceType: 'single', mappings: { properties: {} }, hidden: true },
  ]);
  typeRegistryMock.isSingleNamespace.mockImplementation((type) => type !== 'type-id-4');
  mockSavedObjects.getTypeRegistry.mockReturnValue(typeRegistryMock);

  mockRetrieveClient = savedObjectsClientMock.create();
  mockRetrieveClient.find.mockResolvedValue({ total: 0, saved_objects: [], per_page: 0, page: 0 });
  mockUpdateClient = savedObjectsClientMock.create();
  mockSavedObjects.getScopedClient.mockImplementation((request, params) =>
    params?.excludedWrappers?.[0] === 'encryptedSavedObjects'
      ? mockRetrieveClient
      : mockUpdateClient
  );

  service = new EncryptionKeyRotationService({
    logger: loggingSystemMock.create().get(),
    service: mockEncryptionService,
    getStartServices: coreSetupMock.getStartServices,
  });
});

it('correctly setups Saved Objects clients', async () => {
  const mockRequest = httpServerMock.createKibanaRequest();
  await service.rotate(mockRequest, { batchSize: 10000 });

  expect(mockSavedObjects.getScopedClient).toHaveBeenCalledTimes(2);
  expect(mockSavedObjects.getScopedClient).toHaveBeenCalledWith(mockRequest, {
    includedHiddenTypes: ['type-id-2', 'type-id-4'],
    excludedWrappers: ['encryptedSavedObjects'],
  });
  expect(mockSavedObjects.getScopedClient).toHaveBeenCalledWith(mockRequest, {
    includedHiddenTypes: ['type-id-2', 'type-id-4'],
  });
});

it('bails out if specified type is not registered', async () => {
  mockEncryptionService.isRegistered.mockImplementation((type) => type !== 'type-unknown');

  await expect(
    service.rotate(httpServerMock.createKibanaRequest(), {
      batchSize: 10000,
      type: 'type-unknown',
    })
  ).resolves.toEqual({
    total: 0,
    successful: 0,
    failed: 0,
  });

  expect(mockSavedObjects.getScopedClient).not.toHaveBeenCalled();
});

it('does not perform rotation if there are no Saved Objects to process', async () => {
  await expect(
    service.rotate(httpServerMock.createKibanaRequest(), { batchSize: 12345 })
  ).resolves.toEqual({
    total: 0,
    successful: 0,
    failed: 0,
  });

  expect(mockRetrieveClient.find).toHaveBeenCalledTimes(1);
  expect(mockRetrieveClient.find).toHaveBeenCalledWith({
    type: ['type-id-1', 'type-id-2', 'type-id-4', 'type-id-5'],
    perPage: 12345,
    namespaces: ['*'],
    sortField: 'updated_at',
    sortOrder: 'asc',
  });

  await expect(
    service.rotate(httpServerMock.createKibanaRequest(), { batchSize: 54321, type: 'type-id-2' })
  ).resolves.toEqual({
    total: 0,
    successful: 0,
    failed: 0,
  });

  expect(mockRetrieveClient.find).toHaveBeenCalledTimes(2);
  expect(mockRetrieveClient.find).toHaveBeenCalledWith({
    type: ['type-id-2'],
    perPage: 54321,
    namespaces: ['*'],
    sortField: 'updated_at',
    sortOrder: 'asc',
  });

  expect(mockEncryptionService.decryptAttributes).not.toHaveBeenCalled();
  expect(mockUpdateClient.bulkUpdate).not.toHaveBeenCalled();
});

it('throws if Saved Object attributes cannot be decrypted because of unknown reason', async () => {
  mockRetrieveClient.find.mockResolvedValue({
    total: 2,
    saved_objects: [getMockSavedObject({ id: 'id-1' }), getMockSavedObject({ id: 'id-2' })],
    per_page: 2,
    page: 0,
  });

  const decryptionFailure = new Error('Oh no!');
  mockEncryptionService.decryptAttributes.mockRejectedValue(decryptionFailure);

  await expect(
    service.rotate(httpServerMock.createKibanaRequest(), { batchSize: 12345 })
  ).rejects.toBe(decryptionFailure);

  expect(mockUpdateClient.bulkUpdate).not.toHaveBeenCalled();
});

it('does not perform rotation if Saved Object attributes cannot be decrypted', async () => {
  mockRetrieveClient.find.mockResolvedValue({
    total: 2,
    saved_objects: [getMockSavedObject({ id: 'id-1' }), getMockSavedObject({ id: 'id-2' })],
    per_page: 2,
    page: 0,
  });

  mockEncryptionService.decryptAttributes.mockRejectedValue(
    new EncryptionError('some-message', 'attr', EncryptionErrorOperation.Decryption)
  );

  await expect(
    service.rotate(httpServerMock.createKibanaRequest(), { batchSize: 12345 })
  ).resolves.toEqual({
    total: 2,
    successful: 0,
    failed: 0,
  });

  expect(mockEncryptionService.decryptAttributes).toHaveBeenCalledTimes(2);
  expect(mockUpdateClient.bulkUpdate).not.toHaveBeenCalled();
});

it('properly rotates encryption key', async () => {
  const savedObjects = [
    getMockSavedObject({ id: 'id-1' }),
    getMockSavedObject({ id: 'id-2', namespaces: ['ns-1'] }),
    getMockSavedObject({ id: 'id-4', namespaces: ['ns-2', 'ns-3'] }),
  ];
  mockRetrieveClient.find.mockResolvedValue({
    total: 3,
    saved_objects: savedObjects,
    per_page: 3,
    page: 0,
  });
  mockUpdateClient.bulkUpdate.mockResolvedValue({
    saved_objects: savedObjects.map((object) => ({ ...object, attributes: {} })),
  });

  await expect(
    service.rotate(httpServerMock.createKibanaRequest(), { batchSize: 12345 })
  ).resolves.toEqual({
    total: 3,
    successful: 3,
    failed: 0,
  });

  expect(mockEncryptionService.decryptAttributes).toHaveBeenCalledTimes(3);
  expect(mockEncryptionService.decryptAttributes).toHaveBeenCalledWith(
    { type: 'type-id-1', id: 'id-1' },
    { attr: 'attr-id-1' },
    { omitPrimaryEncryptionKey: true }
  );
  expect(mockEncryptionService.decryptAttributes).toHaveBeenCalledWith(
    { type: 'type-id-2', id: 'id-2', namespace: 'ns-1' },
    { attr: 'attr-id-2' },
    { omitPrimaryEncryptionKey: true }
  );
  expect(mockEncryptionService.decryptAttributes).toHaveBeenCalledWith(
    { type: 'type-id-4', id: 'id-4' },
    { attr: 'attr-id-4' },
    { omitPrimaryEncryptionKey: true }
  );

  expect(mockUpdateClient.bulkUpdate).toHaveBeenCalledTimes(1);
  expect(mockUpdateClient.bulkUpdate).toHaveBeenCalledWith([
    { ...savedObjects[0], attributes: { attr: 'decrypted-attr-id-1' } },
    { ...savedObjects[1], namespace: 'ns-1', attributes: { attr: 'decrypted-attr-id-2' } },
    { ...savedObjects[2], namespace: 'ns-2', attributes: { attr: 'decrypted-attr-id-4' } },
  ]);
});

it('skips objects that cannot be decrypted', async () => {
  const savedObjects = [
    getMockSavedObject({ id: 'id-1' }),
    getMockSavedObject({ id: 'id-2', namespaces: ['ns-1'] }),
    getMockSavedObject({ id: 'id-4', namespaces: ['ns-2', 'ns-3'] }),
  ];
  mockRetrieveClient.find.mockResolvedValue({
    total: 3,
    saved_objects: savedObjects,
    per_page: 3,
    page: 0,
  });
  mockUpdateClient.bulkUpdate.mockResolvedValue({
    saved_objects: [
      { ...savedObjects[0], attributes: {} },
      { ...savedObjects[2], attributes: {} },
    ],
  });

  mockEncryptionService.decryptAttributes.mockImplementation(async ({ type }, { attr }) => {
    if (type === 'type-id-2') {
      throw new EncryptionError('some-message', 'attr', EncryptionErrorOperation.Decryption);
    }

    return { attr: `decrypted-${attr}` };
  });

  await expect(
    service.rotate(httpServerMock.createKibanaRequest(), { batchSize: 12345 })
  ).resolves.toEqual({
    total: 3,
    successful: 2,
    failed: 0,
  });

  expect(mockEncryptionService.decryptAttributes).toHaveBeenCalledTimes(3);
  expect(mockUpdateClient.bulkUpdate).toHaveBeenCalledTimes(1);
  expect(mockUpdateClient.bulkUpdate).toHaveBeenCalledWith([
    { ...savedObjects[0], attributes: { attr: 'decrypted-attr-id-1' } },
    { ...savedObjects[2], namespace: 'ns-2', attributes: { attr: 'decrypted-attr-id-4' } },
  ]);
});

it('marks object that we could not update as failed', async () => {
  const savedObjects = [
    getMockSavedObject({ id: 'id-1' }),
    getMockSavedObject({ id: 'id-2', namespaces: ['ns-1'] }),
    getMockSavedObject({ id: 'id-4', namespaces: ['ns-2', 'ns-3'] }),
  ];
  mockRetrieveClient.find.mockResolvedValue({
    total: 3,
    saved_objects: savedObjects,
    per_page: 3,
    page: 0,
  });
  mockUpdateClient.bulkUpdate.mockResolvedValue({
    saved_objects: [{ ...savedObjects[0], attributes: {} }, { error: new Error('Oh no!') } as any],
  });

  mockEncryptionService.decryptAttributes.mockImplementation(async ({ type }, { attr }) => {
    if (type === 'type-id-2') {
      throw new EncryptionError('some-message', 'attr', EncryptionErrorOperation.Decryption);
    }

    return { attr: `decrypted-${attr}` };
  });

  await expect(
    service.rotate(httpServerMock.createKibanaRequest(), { batchSize: 12345 })
  ).resolves.toEqual({
    total: 3,
    successful: 1,
    failed: 1,
  });

  expect(mockEncryptionService.decryptAttributes).toHaveBeenCalledTimes(3);
  expect(mockUpdateClient.bulkUpdate).toHaveBeenCalledTimes(1);
  expect(mockUpdateClient.bulkUpdate).toHaveBeenCalledWith([
    { ...savedObjects[0], attributes: { attr: 'decrypted-attr-id-1' } },
    { ...savedObjects[2], namespace: 'ns-2', attributes: { attr: 'decrypted-attr-id-4' } },
  ]);
});

it('iterates until number of returned results less than batch size', async () => {
  const savedObjectsBatch0 = [
    getMockSavedObject({ id: 'id-1', type: 'type-id-1' }),
    getMockSavedObject({ id: 'id-2', type: 'type-id-1' }),
    getMockSavedObject({ id: 'id-3', type: 'type-id-1' }),
  ];

  const savedObjectsBatch1 = [
    getMockSavedObject({ id: 'id-4', type: 'type-id-1' }),
    getMockSavedObject({ id: 'id-5', type: 'type-id-1' }),
  ];

  // During first request we had 100 objects in total.
  mockRetrieveClient.find.mockResolvedValueOnce({
    total: 100,
    saved_objects: savedObjectsBatch0,
    per_page: 3,
    page: 0,
  });
  mockUpdateClient.bulkUpdate.mockResolvedValueOnce({
    saved_objects: [
      { ...savedObjectsBatch0[0], attributes: {} },
      { ...savedObjectsBatch0[1], attributes: {} },
      { ...savedObjectsBatch0[2], attributes: {} },
    ],
  });

  // But when we fetch data for the second time we have just two objects left (e.g. they were removed).
  mockRetrieveClient.find.mockResolvedValueOnce({
    total: 2,
    saved_objects: savedObjectsBatch1,
    per_page: 2,
    page: 0,
  });
  mockUpdateClient.bulkUpdate.mockResolvedValueOnce({
    saved_objects: [
      { ...savedObjectsBatch1[0], attributes: {} },
      { ...savedObjectsBatch1[1], attributes: {} },
    ],
  });

  await expect(
    service.rotate(httpServerMock.createKibanaRequest(), { batchSize: 3 })
  ).resolves.toEqual({
    total: 100,
    successful: 5,
    failed: 0,
  });

  expect(mockRetrieveClient.find).toHaveBeenCalledTimes(2);
  expect(mockEncryptionService.decryptAttributes).toHaveBeenCalledTimes(5);
  expect(mockUpdateClient.bulkUpdate).toHaveBeenCalledTimes(2);
  expect(mockUpdateClient.bulkUpdate).toHaveBeenCalledWith([
    { ...savedObjectsBatch0[0], attributes: { attr: 'decrypted-attr-id-1' } },
    { ...savedObjectsBatch0[1], attributes: { attr: 'decrypted-attr-id-2' } },
    { ...savedObjectsBatch0[2], attributes: { attr: 'decrypted-attr-id-3' } },
  ]);
  expect(mockUpdateClient.bulkUpdate).toHaveBeenCalledWith([
    { ...savedObjectsBatch1[0], attributes: { attr: 'decrypted-attr-id-4' } },
    { ...savedObjectsBatch1[1], attributes: { attr: 'decrypted-attr-id-5' } },
  ]);
});

it('iterates until no new objects are returned', async () => {
  const savedObjectBatches = [
    [
      getMockSavedObject({ id: 'id-1', type: 'type-id-1' }),
      getMockSavedObject({ id: 'id-2', type: 'type-id-1' }),
      getMockSavedObject({ id: 'id-3', type: 'type-id-1' }),
    ],
    [
      getMockSavedObject({ id: 'id-4', type: 'type-id-1' }),
      getMockSavedObject({ id: 'id-5', type: 'type-id-1' }),
      getMockSavedObject({ id: 'id-6', type: 'type-id-1' }),
    ],
    [
      getMockSavedObject({ id: 'id-7', type: 'type-id-1' }),
      getMockSavedObject({ id: 'id-8', type: 'type-id-1' }),
      getMockSavedObject({ id: 'id-9', type: 'type-id-1' }),
    ],
    [
      getMockSavedObject({ id: 'id-1', type: 'type-id-1' }),
      getMockSavedObject({ id: 'id-2', type: 'type-id-1' }),
      getMockSavedObject({ id: 'id-3', type: 'type-id-1' }),
    ],
  ];

  for (const batch of savedObjectBatches) {
    mockRetrieveClient.find.mockResolvedValueOnce({
      total: 100,
      saved_objects: batch,
      per_page: 3,
      page: 0,
    });
    mockUpdateClient.bulkUpdate.mockResolvedValueOnce({
      saved_objects: batch.map((object) => ({ ...object, attributes: {} })),
    });
  }

  await expect(
    service.rotate(httpServerMock.createKibanaRequest(), { batchSize: 3 })
  ).resolves.toEqual({
    total: 100,
    successful: 9,
    failed: 0,
  });

  expect(mockRetrieveClient.find).toHaveBeenCalledTimes(4);
  // We don't decrypt\update same object twice, so neither object from the last batch is decrypted or updated.
  expect(mockEncryptionService.decryptAttributes).toHaveBeenCalledTimes(9);
  expect(mockUpdateClient.bulkUpdate).toHaveBeenCalledTimes(3);
  for (const batch of savedObjectBatches.slice(0, 3)) {
    expect(mockUpdateClient.bulkUpdate).toHaveBeenCalledWith(
      batch.map((object) => ({
        ...object,
        attributes: { attr: `decrypted-${object.attributes.attr}` },
      }))
    );
  }
});

it('iterates until max number of batches is reached', async () => {
  // Simulate the scenario when we're getting more records then was indicated by the `total` field
  // returned with the first batch, and every such batch includes documents we haven't processed yet.
  const savedObjectBatches = [
    [
      getMockSavedObject({ id: 'id-1', type: 'type-id-1' }),
      getMockSavedObject({ id: 'id-2', type: 'type-id-1' }),
    ],
    [
      getMockSavedObject({ id: 'id-3', type: 'type-id-1' }),
      getMockSavedObject({ id: 'id-4', type: 'type-id-1' }),
    ],
    [
      getMockSavedObject({ id: 'id-5', type: 'type-id-1' }),
      getMockSavedObject({ id: 'id-6', type: 'type-id-1' }),
    ],
    [
      getMockSavedObject({ id: 'id-7', type: 'type-id-1' }),
      getMockSavedObject({ id: 'id-8', type: 'type-id-1' }),
    ],
  ];

  for (const batch of savedObjectBatches) {
    mockRetrieveClient.find.mockResolvedValueOnce({
      total: 3,
      saved_objects: batch,
      per_page: 2,
      page: 0,
    });
    mockUpdateClient.bulkUpdate.mockResolvedValueOnce({
      saved_objects: batch.map((object) => ({ ...object, attributes: {} })),
    });
  }

  await expect(
    service.rotate(httpServerMock.createKibanaRequest(), { batchSize: 2 })
  ).resolves.toEqual({
    total: 3,
    successful: 6,
    failed: 0,
  });

  expect(mockRetrieveClient.find).toHaveBeenCalledTimes(3);
  expect(mockEncryptionService.decryptAttributes).toHaveBeenCalledTimes(6);
  expect(mockUpdateClient.bulkUpdate).toHaveBeenCalledTimes(3);
  for (const batch of savedObjectBatches.slice(0, 3)) {
    expect(mockUpdateClient.bulkUpdate).toHaveBeenCalledWith(
      batch.map((object) => ({
        ...object,
        attributes: { attr: `decrypted-${object.attributes.attr}` },
      }))
    );
  }
});
