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
  httpServerMock,
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
  savedObjectsTypeRegistryMock,
} from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';

import type { ClientInstanciator } from '.';
import { setupSavedObjects } from '.';
import type { EncryptedSavedObjectsService } from '../crypto';
import { encryptedSavedObjectsServiceMock } from '../crypto/index.mock';
import { EncryptedSavedObjectsClientWrapper } from './encrypted_saved_objects_client_wrapper';

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
      security: securityMock.createSetup(),
      getStartServices: coreSetupMock.getStartServices,
    });
  });

  it('properly registers client wrapper factory', () => {
    expect(coreSetupMock.savedObjects.addClientWrapper).toHaveBeenCalledTimes(1);
    expect(coreSetupMock.savedObjects.addClientWrapper).toHaveBeenCalledWith(
      Number.MAX_SAFE_INTEGER,
      'encryptedSavedObjects',
      expect.any(Function)
    );

    const [[, , clientFactory]] = coreSetupMock.savedObjects.addClientWrapper.mock.calls;
    expect(
      clientFactory({
        client: savedObjectsClientMock.create(),
        typeRegistry: savedObjectsTypeRegistryMock.create(),
        request: httpServerMock.createKibanaRequest(),
      })
    ).toBeInstanceOf(EncryptedSavedObjectsClientWrapper);
  });

  it('properly registers client wrapper factory with', () => {
    expect(coreSetupMock.savedObjects.addClientWrapper).toHaveBeenCalledTimes(1);
    expect(coreSetupMock.savedObjects.addClientWrapper).toHaveBeenCalledWith(
      Number.MAX_SAFE_INTEGER,
      'encryptedSavedObjects',
      expect.any(Function)
    );

    const [[, , clientFactory]] = coreSetupMock.savedObjects.addClientWrapper.mock.calls;
    expect(
      clientFactory({
        client: savedObjectsClientMock.create(),
        typeRegistry: savedObjectsTypeRegistryMock.create(),
        request: httpServerMock.createKibanaRequest(),
      })
    ).toBeInstanceOf(EncryptedSavedObjectsClientWrapper);
  });

  describe('#setupContract', () => {
    it('includes hiddenTypes when specified', async () => {
      await setupContract({ includedHiddenTypes: ['hiddenType'] });
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
  });
});
