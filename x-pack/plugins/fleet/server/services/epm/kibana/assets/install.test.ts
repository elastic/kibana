/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ISavedObjectsImporter,
  SavedObjectsImportFailure,
  SavedObjectsImportSuccess,
  SavedObjectsImportResponse,
} from '@kbn/core/server';
import {
  loggingSystemMock,
  savedObjectsClientMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';

import { appContextService } from '../../../app_context';

import { type ArchiveAsset, getSpaceAwareSaveobjectsClients } from './install';

jest.mock('timers/promises', () => ({
  async setTimeout() {},
}));
jest.mock('../../../app_context');

import { createSavedObjectKibanaAsset, installKibanaSavedObjects } from './install';

const mockLogger = loggingSystemMock.createLogger();

const mockImporter: jest.Mocked<ISavedObjectsImporter> = {
  import: jest.fn(),
  resolveImportErrors: jest.fn(),
};

const createImportError = (so: ArchiveAsset, type: string) =>
  ({ id: so.id, error: { type } } as SavedObjectsImportFailure);
const createImportSuccess = (so: ArchiveAsset) =>
  ({ id: so.id, type: so.type, meta: {} } as SavedObjectsImportSuccess);
const createAsset = (asset: Partial<ArchiveAsset>) =>
  ({ id: 1234, type: 'dashboard', attributes: {}, ...asset } as ArchiveAsset);

const createImportResponse = (
  errors: SavedObjectsImportFailure[] = [],
  successResults: SavedObjectsImportSuccess[] = []
) =>
  ({
    success: !!successResults.length,
    errors,
    successResults,
    warnings: [],
    successCount: successResults.length,
  } as SavedObjectsImportResponse);

describe('installKibanaSavedObjects', () => {
  beforeEach(() => {
    mockImporter.import.mockReset();
    mockImporter.resolveImportErrors.mockReset();
  });

  it('should retry on conflict error', async () => {
    const asset = createAsset({ attributes: { hello: 'world' } });
    const conflictResponse = createImportResponse([createImportError(asset, 'conflict')]);
    const successResponse = createImportResponse([], [createImportSuccess(asset)]);

    mockImporter.import
      .mockResolvedValueOnce(conflictResponse)
      .mockResolvedValueOnce(successResponse);

    await installKibanaSavedObjects({
      savedObjectsImporter: mockImporter,
      logger: mockLogger,
      kibanaAssets: [asset],
    });

    expect(mockImporter.import).toHaveBeenCalledTimes(2);
  });

  it('should give up after 50 retries on conflict errors', async () => {
    const asset = createAsset({ attributes: { hello: 'world' } });
    const conflictResponse = createImportResponse([createImportError(asset, 'conflict')]);

    mockImporter.import.mockImplementation(() => Promise.resolve(conflictResponse));

    await expect(
      installKibanaSavedObjects({
        savedObjectsImporter: mockImporter,
        logger: mockLogger,
        kibanaAssets: [asset],
      })
    ).rejects.toEqual(expect.any(Error));
    expect(mockImporter.import).toHaveBeenCalledTimes(51);
  });
  it('should not retry errors that arent conflict errors', async () => {
    const asset = createAsset({ attributes: { hello: 'world' } });
    const errorResponse = createImportResponse([createImportError(asset, 'something_bad')]);
    const successResponse = createImportResponse([], [createImportSuccess(asset)]);

    mockImporter.import.mockResolvedValueOnce(errorResponse).mockResolvedValueOnce(successResponse);

    await expect(
      installKibanaSavedObjects({
        savedObjectsImporter: mockImporter,
        logger: mockLogger,
        kibanaAssets: [asset],
      })
    ).rejects.toEqual(expect.any(Error));
  });

  it('should resolve reference errors', async () => {
    const asset = createAsset({ attributes: { hello: 'world' } });
    const referenceErrorResponse = createImportResponse([
      createImportError(asset, 'missing_references'),
    ]);
    const successResponse = createImportResponse([], [createImportSuccess(asset)]);

    mockImporter.import.mockResolvedValueOnce(referenceErrorResponse);
    mockImporter.resolveImportErrors.mockResolvedValueOnce(successResponse);

    await installKibanaSavedObjects({
      savedObjectsImporter: mockImporter,
      logger: mockLogger,
      kibanaAssets: [asset],
    });

    expect(mockImporter.import).toHaveBeenCalledTimes(1);
    expect(mockImporter.resolveImportErrors).toHaveBeenCalledTimes(1);
  });
});

describe('createSavedObjectKibanaAsset', () => {
  it('should set migrationVersion as typeMigrationVersion in so', () => {
    const asset = createAsset({
      attributes: { hello: 'world' },
      migrationVersion: { dashboard: '8.6.0' },
    });
    const result = createSavedObjectKibanaAsset(asset);

    expect(result.typeMigrationVersion).toEqual('8.6.0');
  });

  it('should set coreMigrationVersion and typeMigrationVersion in so', () => {
    const asset = createAsset({
      attributes: { hello: 'world' },
      typeMigrationVersion: '8.6.0',
      coreMigrationVersion: '8.7.0',
    });
    const result = createSavedObjectKibanaAsset(asset);

    expect(result.typeMigrationVersion).toEqual('8.6.0');
    expect(result.coreMigrationVersion).toEqual('8.7.0');
  });
});

describe('getSpaceAwareSaveobjectsClients', () => {
  it('return space scopped clients', () => {
    const soStartMock = savedObjectsServiceMock.createStartContract();
    const mockedSavedObjectTagging = {
      createInternalAssignmentService: jest.fn(),
      createTagClient: jest.fn(),
    };

    const scoppedSoClient = savedObjectsClientMock.create();
    jest
      .mocked(appContextService.getInternalUserSOClientForSpaceId)
      .mockReturnValue(scoppedSoClient);

    jest.mocked(appContextService.getSavedObjects).mockReturnValue(soStartMock);
    jest.mocked(appContextService.getSavedObjectsTagging).mockReturnValue(mockedSavedObjectTagging);

    getSpaceAwareSaveobjectsClients('test1');

    expect(appContextService.getInternalUserSOClientForSpaceId).toBeCalledWith('test1');
    expect(soStartMock.createImporter).toBeCalledWith(scoppedSoClient, expect.anything());
    expect(mockedSavedObjectTagging.createInternalAssignmentService).toBeCalledWith({
      client: scoppedSoClient,
    });
    expect(mockedSavedObjectTagging.createTagClient).toBeCalledWith({ client: scoppedSoClient });
  });
});
