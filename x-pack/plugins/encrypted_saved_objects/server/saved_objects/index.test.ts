/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ISavedObjectsRepository,
  ISavedObjectTypeRegistry,
  SavedObject,
} from '@kbn/core/server';
import {
  coreMock,
  savedObjectsRepositoryMock,
  savedObjectsTypeRegistryMock,
} from '@kbn/core/server/mocks';
import { nextTick } from '@kbn/test-jest-helpers';

import type { ClientInstanciator } from '.';
import { setupSavedObjects } from '.';
import type { EncryptedSavedObjectsService } from '../crypto';
import { encryptedSavedObjectsServiceMock } from '../crypto/index.mock';

describe('#setupSavedObjects', () => {
  let setupContract: ClientInstanciator;
  let coreStartMock: ReturnType<typeof coreMock.createStart>;
  let coreSetupMock: ReturnType<typeof coreMock.createSetup>;
  let mockSavedObjectsRepository: jest.Mocked<ISavedObjectsRepository>;
  let mockSavedObjectTypeRegistry: jest.Mocked<ISavedObjectTypeRegistry>;
  let mockEncryptedSavedObjectsService: jest.Mocked<EncryptedSavedObjectsService>;
  beforeEach(() => {
    coreStartMock = coreMock.createStart();

    mockSavedObjectsRepository = savedObjectsRepositoryMock.create();
    coreStartMock.savedObjects.createInternalRepository.mockReturnValue(mockSavedObjectsRepository);

    mockSavedObjectTypeRegistry = savedObjectsTypeRegistryMock.create();
    coreStartMock.savedObjects.getTypeRegistry.mockReturnValue(mockSavedObjectTypeRegistry);

    coreSetupMock = coreMock.createSetup();
    coreSetupMock.getStartServices.mockResolvedValue([coreStartMock, {}, {}]);

    mockEncryptedSavedObjectsService = encryptedSavedObjectsServiceMock.createWithTypes([
      { type: 'known-type', attributesToEncrypt: new Set(['attrSecret']) },
    ]);
    setupContract = setupSavedObjects({
      service: mockEncryptedSavedObjectsService,
      savedObjects: coreSetupMock.savedObjects,
      getStartServices: coreSetupMock.getStartServices,
    });
  });

  describe('#setupContract', () => {
    it('includes hiddenTypes when specified', async () => {
      setupContract({ includedHiddenTypes: ['hiddenType'] });
      await nextTick();
      expect(coreStartMock.savedObjects.createInternalRepository).toHaveBeenCalledWith([
        'hiddenType',
      ]);
    });
  });

  describe('#getDecryptedAsInternalUser', () => {
    it('includes `namespace` for single-namespace saved objects', async () => {
      const mockSavedObject: SavedObject = {
        id: 'some-id',
        type: 'known-type',
        attributes: { attrOne: 'one', attrSecret: '*secret*' },
        references: [],
        namespaces: ['some-ns'],
      };
      mockSavedObjectsRepository.get.mockResolvedValue(mockSavedObject);
      mockSavedObjectTypeRegistry.isSingleNamespace.mockReturnValue(true);

      await expect(
        setupContract().getDecryptedAsInternalUser(mockSavedObject.type, mockSavedObject.id, {
          namespace: 'some-ns',
        })
      ).resolves.toEqual({
        ...mockSavedObject,
        attributes: { attrOne: 'one', attrSecret: 'secret' },
      });

      expect(mockEncryptedSavedObjectsService.decryptAttributes).toHaveBeenCalledTimes(1);
      expect(mockEncryptedSavedObjectsService.decryptAttributes).toHaveBeenCalledWith(
        { type: mockSavedObject.type, id: mockSavedObject.id, namespace: 'some-ns' },
        mockSavedObject.attributes
      );

      expect(mockSavedObjectsRepository.get).toHaveBeenCalledTimes(1);
      expect(mockSavedObjectsRepository.get).toHaveBeenCalledWith(
        mockSavedObject.type,
        mockSavedObject.id,
        { namespace: 'some-ns' }
      );
    });

    it('does not include `namespace` for multiple-namespace saved objects', async () => {
      const mockSavedObject: SavedObject = {
        id: 'some-id',
        type: 'known-type',
        attributes: { attrOne: 'one', attrSecret: '*secret*' },
        references: [],
        namespaces: ['some-ns2', 'some-ns'],
      };
      mockSavedObjectsRepository.get.mockResolvedValue(mockSavedObject);
      mockSavedObjectTypeRegistry.isSingleNamespace.mockReturnValue(false);

      await expect(
        setupContract().getDecryptedAsInternalUser(mockSavedObject.type, mockSavedObject.id, {
          namespace: 'some-ns',
        })
      ).resolves.toEqual({
        ...mockSavedObject,
        attributes: { attrOne: 'one', attrSecret: 'secret' },
      });

      expect(mockEncryptedSavedObjectsService.decryptAttributes).toHaveBeenCalledTimes(1);
      expect(mockEncryptedSavedObjectsService.decryptAttributes).toHaveBeenCalledWith(
        { type: mockSavedObject.type, id: mockSavedObject.id, namespace: undefined },
        mockSavedObject.attributes
      );

      expect(mockSavedObjectsRepository.get).toHaveBeenCalledTimes(1);
      expect(mockSavedObjectsRepository.get).toHaveBeenCalledWith(
        mockSavedObject.type,
        mockSavedObject.id,
        { namespace: 'some-ns' }
      );
    });

    it('does not call decryptAttributes if Saved Object type is not registered', async () => {
      const mockSavedObject: SavedObject = {
        id: 'some-id',
        type: 'not-known-type',
        attributes: { attrOne: 'one', attrSecret: '*secret*' },
        references: [],
      };
      mockSavedObjectsRepository.get.mockResolvedValue(mockSavedObject);

      await expect(
        setupContract().getDecryptedAsInternalUser(mockSavedObject.type, mockSavedObject.id, {
          namespace: 'some-ns',
        })
      ).resolves.toEqual(mockSavedObject);

      expect(mockEncryptedSavedObjectsService.decryptAttributes).toHaveBeenCalledTimes(0);
    });
  });

  describe('#createPointInTimeFinderDecryptedAsInternalUser', () => {
    it('includes `namespace` for single-namespace saved objects', async () => {
      const mockSavedObject: SavedObject = {
        id: 'some-id',
        type: 'known-type',
        attributes: { attrOne: 'one', attrSecret: '*secret*' },
        references: [],
        namespaces: ['some-ns'],
      };
      mockSavedObjectsRepository.createPointInTimeFinder = jest.fn().mockReturnValue({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [mockSavedObject] };
        },
      });

      mockSavedObjectTypeRegistry.isSingleNamespace.mockReturnValue(true);

      const finder = await setupContract().createPointInTimeFinderDecryptedAsInternalUser({
        type: 'known-type',
        namespaces: ['some-ns'],
      });

      for await (const res of finder.find()) {
        expect(res).toEqual({
          saved_objects: [
            {
              ...mockSavedObject,
              attributes: { attrOne: 'one', attrSecret: 'secret' },
            },
          ],
        });
      }

      expect(mockEncryptedSavedObjectsService.decryptAttributes).toHaveBeenCalledTimes(1);
      expect(mockEncryptedSavedObjectsService.decryptAttributes).toHaveBeenCalledWith(
        { type: mockSavedObject.type, id: mockSavedObject.id, namespace: 'some-ns' },
        mockSavedObject.attributes
      );

      expect(mockSavedObjectsRepository.createPointInTimeFinder).toHaveBeenCalledTimes(1);
      expect(mockSavedObjectsRepository.createPointInTimeFinder).toHaveBeenCalledWith(
        { type: 'known-type', namespaces: ['some-ns'] },
        undefined
      );
    });

    it('does not include `namespace` for multiple-namespace saved objects', async () => {
      const mockSavedObject: SavedObject = {
        id: 'some-id',
        type: 'known-type',
        attributes: { attrOne: 'one', attrSecret: '*secret*' },
        references: [],
      };
      mockSavedObjectsRepository.createPointInTimeFinder = jest.fn().mockReturnValue({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [mockSavedObject] };
        },
      });

      mockSavedObjectTypeRegistry.isSingleNamespace.mockReturnValue(false);

      const finder = await setupContract().createPointInTimeFinderDecryptedAsInternalUser({
        type: 'known-type',
        namespaces: ['some-ns'],
      });

      for await (const res of finder.find()) {
        expect(res).toEqual({
          saved_objects: [
            {
              ...mockSavedObject,
              attributes: { attrOne: 'one', attrSecret: 'secret' },
            },
          ],
        });
      }

      expect(mockEncryptedSavedObjectsService.decryptAttributes).toHaveBeenCalledTimes(1);
      expect(mockEncryptedSavedObjectsService.decryptAttributes).toHaveBeenCalledWith(
        { type: mockSavedObject.type, id: mockSavedObject.id, namespace: undefined },
        mockSavedObject.attributes
      );

      expect(mockSavedObjectsRepository.createPointInTimeFinder).toHaveBeenCalledTimes(1);
      expect(mockSavedObjectsRepository.createPointInTimeFinder).toHaveBeenCalledWith(
        { type: 'known-type', namespaces: ['some-ns'] },
        undefined
      );
    });

    it('does not call decryptAttributes if Saved Object type is not registered', async () => {
      const mockSavedObject: SavedObject = {
        id: 'some-id',
        type: 'not-known-type',
        attributes: { attrOne: 'one', attrSecret: '*secret*' },
        references: [],
      };
      mockSavedObjectsRepository.createPointInTimeFinder = jest.fn().mockReturnValue({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [mockSavedObject] };
        },
      });

      const finder = await setupContract().createPointInTimeFinderDecryptedAsInternalUser({
        type: 'not-known-type',
        namespaces: ['some-ns'],
      });

      for await (const res of finder.find()) {
        expect(res).toEqual({
          saved_objects: [mockSavedObject],
        });
      }

      expect(mockEncryptedSavedObjectsService.decryptAttributes).toHaveBeenCalledTimes(0);
    });

    it('returns error within Saved Object if decryption failed', async () => {
      const mockSavedObject: SavedObject = {
        id: 'some-id',
        type: 'known-type',
        attributes: { attrOne: 'one', attrSecret: '*secret*' },
        references: [],
      };
      mockSavedObjectsRepository.createPointInTimeFinder = jest.fn().mockReturnValue({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [mockSavedObject] };
        },
      });

      mockEncryptedSavedObjectsService.decryptAttributes.mockImplementation(() => {
        throw new Error('Test failure');
      });

      const finder = await setupContract().createPointInTimeFinderDecryptedAsInternalUser({
        type: 'known-type',
        namespaces: ['some-ns'],
      });

      for await (const res of finder.find()) {
        expect(res.saved_objects[0].error).toHaveProperty('message', 'Test failure');
      }
    });

    it('properly re-exposes `close` method of the underlying point in time finder ', async () => {
      // The finder that underlying repository returns is an instance of a `PointInTimeFinder` class that cannot, and
      // unlike object literal it cannot be "copied" with the spread operator. We should make sure we properly re-expose
      // `close` function.
      const mockClose = jest.fn();
      mockSavedObjectsRepository.createPointInTimeFinder = jest.fn().mockImplementation(() => {
        class MockPointInTimeFinder {
          async close() {
            mockClose();
          }
          async *find() {}
        }

        return new MockPointInTimeFinder();
      });

      const finder = await setupContract().createPointInTimeFinderDecryptedAsInternalUser({
        type: 'known-type',
      });

      expect(finder.find).toBeInstanceOf(Function);
      expect(finder.close).toBeInstanceOf(Function);

      await finder.close();
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('includes `namespace` for * find option', async () => {
      const mockSavedObject: SavedObject = {
        id: 'some-id',
        type: 'known-type',
        attributes: { attrOne: 'one', attrSecret: '*secret*' },
        references: [],
        namespaces: ['some-ns'],
      };
      mockSavedObjectsRepository.createPointInTimeFinder = jest.fn().mockReturnValue({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [mockSavedObject] };
        },
      });

      mockSavedObjectTypeRegistry.isSingleNamespace.mockReturnValue(true);

      const finder = await setupContract().createPointInTimeFinderDecryptedAsInternalUser({
        type: 'known-type',
        namespaces: ['*'],
      });

      for await (const res of finder.find()) {
        expect(res).toEqual({
          saved_objects: [
            {
              ...mockSavedObject,
              attributes: { attrOne: 'one', attrSecret: 'secret' },
            },
          ],
        });
      }

      expect(mockEncryptedSavedObjectsService.decryptAttributes).toHaveBeenCalledTimes(1);
      expect(mockEncryptedSavedObjectsService.decryptAttributes).toHaveBeenCalledWith(
        { type: mockSavedObject.type, id: mockSavedObject.id, namespace: 'some-ns' },
        mockSavedObject.attributes
      );

      expect(mockSavedObjectsRepository.createPointInTimeFinder).toHaveBeenCalledTimes(1);
      expect(mockSavedObjectsRepository.createPointInTimeFinder).toHaveBeenCalledWith(
        { type: 'known-type', namespaces: ['*'] },
        undefined
      );
    });
  });
});
