/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { migrateLegacyPrivateLocations } from './migrate_legacy_private_locations';
import { SyntheticsServerSetup } from '../../../types';
import { coreMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  type ISavedObjectsRepository,
  SavedObjectsClientContract,
} from '@kbn/core-saved-objects-api-server';

describe('migrateLegacyPrivateLocations', () => {
  let serverMock: SyntheticsServerSetup;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let repositoryMock: ISavedObjectsRepository;
  beforeEach(() => {
    const coreStartMock = coreMock.createStart();
    serverMock = {
      coreStart: coreStartMock,
      logger: loggerMock.create(),
    } as any;
    savedObjectsClient = savedObjectsClientMock.create();
    repositoryMock = coreMock.createStart().savedObjects.createInternalRepository();

    coreStartMock.savedObjects.createInternalRepository.mockReturnValue(repositoryMock);
  });

  it('should get the legacy private locations', async () => {
    savedObjectsClient.get.mockResolvedValueOnce({
      attributes: { locations: [{ id: '1', label: 'Location 1' }] },
    } as any);
    savedObjectsClient.find.mockResolvedValueOnce({ total: 1 } as any);

    await migrateLegacyPrivateLocations({
      server: serverMock,
      savedObjectsClient,
    } as any);

    expect(savedObjectsClient.get).toHaveBeenCalledWith(
      'synthetics-privates-locations',
      'synthetics-privates-locations-singleton'
    );
  });

  it('should log and return if an error occurs while getting legacy private locations', async () => {
    const error = new Error('Get error');
    savedObjectsClient.get.mockRejectedValueOnce(error);

    await migrateLegacyPrivateLocations({
      server: serverMock,
      savedObjectsClient,
    } as any);

    expect(serverMock.logger.error).toHaveBeenCalledWith(
      `Error getting legacy private locations: ${error}`
    );
    expect(repositoryMock.bulkCreate).not.toHaveBeenCalled();
  });

  it('should return if there are no legacy locations', async () => {
    savedObjectsClient.get.mockResolvedValueOnce({
      attributes: { locations: [] },
    } as any);

    await migrateLegacyPrivateLocations({
      server: serverMock,
      savedObjectsClient: savedObjectsClientMock,
    } as any);

    expect(repositoryMock.bulkCreate).not.toHaveBeenCalled();
  });

  it('should bulk create new private locations if there are legacy locations', async () => {
    const legacyLocations = [{ id: '1', label: 'Location 1' }];
    savedObjectsClient.get.mockResolvedValueOnce({
      attributes: { locations: legacyLocations },
    } as any);
    savedObjectsClient.find.mockResolvedValueOnce({ total: 1 } as any);

    await migrateLegacyPrivateLocations({
      server: serverMock,
      savedObjectsClient,
    } as any);

    expect(repositoryMock.bulkCreate).toHaveBeenCalledWith(
      legacyLocations.map((location) => ({
        id: location.id,
        attributes: location,
        type: 'synthetics-private-location',
        initialNamespaces: ['*'],
      })),
      { overwrite: true }
    );
  });

  it('should delete legacy private locations if bulk create count matches', async () => {
    const legacyLocations = [{ id: '1', label: 'Location 1' }];
    savedObjectsClient.get.mockResolvedValueOnce({
      attributes: { locations: legacyLocations },
    } as any);
    savedObjectsClient.find.mockResolvedValueOnce({ total: 1 } as any);

    await migrateLegacyPrivateLocations({
      server: serverMock,
      savedObjectsClient,
    } as any);

    expect(savedObjectsClient.delete).toHaveBeenCalledWith(
      'synthetics-privates-locations',
      'synthetics-privates-locations-singleton',
      {}
    );
  });
});
