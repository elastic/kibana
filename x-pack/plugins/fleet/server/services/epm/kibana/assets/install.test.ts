/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ISavedObjectsImporter,
  SavedObjectsImportFailure,
  SavedObjectsImportSuccess,
  SavedObjectsImportResponse,
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import { createListStream } from '@kbn/utils';

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { getIndexPatternSavedObjects } from '../index_pattern/install';

import { ArchiveAsset, handleIndexPatternImport } from './install';

jest.mock('@kbn/utils');

jest.mock('timers/promises', () => ({
  async setTimeout() {},
}));

import { createSavedObjectKibanaAsset, installKibanaSavedObjects } from './install';

const mockCreateListStream = createListStream as jest.MockedFunction<typeof createListStream>;

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
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    mockSavedObjectsClient = savedObjectsClientMock.create();
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
      savedObjectsClient: mockSavedObjectsClient,
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
        savedObjectsClient: mockSavedObjectsClient,
        savedObjectsImporter: mockImporter,
        logger: mockLogger,
        kibanaAssets: [asset],
      })
    ).rejects.toEqual(expect.any(Error));
    expect(mockImporter.import).toHaveBeenCalledTimes(52);
  });
  it('should not retry errors that arent conflict errors', async () => {
    const asset = createAsset({ attributes: { hello: 'world' } });
    const errorResponse = createImportResponse([createImportError(asset, 'something_bad')]);
    const successResponse = createImportResponse([], [createImportSuccess(asset)]);

    mockImporter.import
      .mockResolvedValueOnce(successResponse)
      .mockResolvedValueOnce(errorResponse)
      .mockResolvedValueOnce(successResponse);

    expect(
      installKibanaSavedObjects({
        savedObjectsClient: mockSavedObjectsClient,
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

    mockImporter.import.mockResolvedValue(referenceErrorResponse);
    mockImporter.resolveImportErrors.mockResolvedValueOnce(successResponse);

    await installKibanaSavedObjects({
      savedObjectsClient: mockSavedObjectsClient,
      savedObjectsImporter: mockImporter,
      logger: mockLogger,
      kibanaAssets: [asset],
    });

    expect(mockImporter.import).toHaveBeenCalledTimes(2);
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

describe('handleIndexPatternImport', () => {
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    mockSavedObjectsClient = savedObjectsClientMock.create();
    mockImporter.import.mockReset();
    mockCreateListStream.mockReset();
  });

  it('updates existing data views and creates non-existing ones', async () => {
    const indexPatternSavedObjects: any = getIndexPatternSavedObjects();

    mockSavedObjectsClient.get.mockImplementation((type, id) => {
      if (type !== 'index-pattern') {
        throw new Error(`savedObjectsClient.get called with unexpected type ${type}`);
      }

      // For this test, only the `logs-*` index pattern exists, the `metrics-*` pattern should be
      // created as a new index pattern
      if (id === 'logs-*') {
        return Promise.resolve({
          id: 'logs-*',
          type: 'index-pattern',
          attributes: {
            title: 'logs-*',
            timeFieldName: '@timestamp',
            allowNoIndex: true,
          },
          references: [],
        });
      }

      return Promise.reject(
        SavedObjectsErrorHelpers.createGenericNotFoundError('index-pattern', id)
      );
    });

    await handleIndexPatternImport({
      indexPatternSavedObjects,
      savedObjectsClient: mockSavedObjectsClient,
      savedObjectsImporter: mockImporter,
      logger: mockLogger,
    });

    // Existing logs-* data view should be updated to new pattern + name
    expect(mockSavedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
      'index-pattern',
      'logs-*',
      expect.objectContaining({ title: 'logs-*,*:logs-*', name: 'Logs' })
    );

    // metrics-* pattern should be streamified and then imported
    expect(mockCreateListStream).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'metrics-*',
        type: 'index-pattern',
        attributes: expect.objectContaining({
          title: 'metrics-*,*:metrics-*',
          name: 'Metrics',
        }),
      }),
    ]);
    expect(mockImporter.import).toHaveBeenCalledTimes(1);
  });
});
