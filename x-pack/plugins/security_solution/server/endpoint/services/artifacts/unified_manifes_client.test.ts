/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNIFIED_MANIFEST_ALL_NAMESPACES, UnifiedManifestClient } from './unified_manifest_client';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { ManifestConstants } from '../../lib/artifacts';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { InternalUnifiedManifestSchema } from '../../schemas';

describe('unified_manifest_client', () => {
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let unifiedManifestClient: UnifiedManifestClient;

  const mockUnifiedManifestAttributes = ({
    policyId,
    artifactIds,
  }: { policyId?: string; artifactIds?: string[] } = {}) => ({
    policyId: policyId ?? '123',
    artifactIds: artifactIds ?? ['artifact-123'],
    semanticVersion: '1.0.0',
  });

  const mockSoClientCallParams = (
    { id, version }: { id?: string; version?: string } = {},
    attachAttributes = true,
    attachCreated = true
  ) => ({
    ...(id && { id }),
    type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE,
    ...(attachAttributes && {
      attributes: mockUnifiedManifestAttributes(),
    }),
    ...(version && { version }),
  });

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
    unifiedManifestClient = new UnifiedManifestClient(savedObjectsClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('can create UnifiedManifestClient', () => {
    expect(unifiedManifestClient).toBeInstanceOf(UnifiedManifestClient);
  });

  describe('Create methods', () => {
    test('can create unified manifest', async () => {
      await unifiedManifestClient.createUnifiedManifest(mockUnifiedManifestAttributes());
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([mockSoClientCallParams()]),
        { initialNamespaces: [UNIFIED_MANIFEST_ALL_NAMESPACES] }
      );
    });
    test('can create unified manifests', async () => {
      await unifiedManifestClient.createUnifiedManifests([
        mockUnifiedManifestAttributes(),
        mockUnifiedManifestAttributes(),
      ]);
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([mockSoClientCallParams(), mockSoClientCallParams()]),
        { initialNamespaces: [UNIFIED_MANIFEST_ALL_NAMESPACES] }
      );
    });
  });
  describe('Read methods', () => {
    test('can get unified manifest by id', async () => {
      await unifiedManifestClient.getUnifiedManifestById('123');
      expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith(
        expect.arrayContaining([mockSoClientCallParams({ id: '123' }, false)]),
        { namespace: UNIFIED_MANIFEST_ALL_NAMESPACES }
      );
    });

    test('can get unified manifests by ids', async () => {
      await unifiedManifestClient.getUnifiedManifestByIds(['123', '456']);
      expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith(
        expect.arrayContaining([
          mockSoClientCallParams({ id: '123' }, false),
          mockSoClientCallParams({ id: '456' }, false),
        ]),
        { namespace: UNIFIED_MANIFEST_ALL_NAMESPACES }
      );
    });

    test('can get unified manifest by policyId', async () => {
      await unifiedManifestClient.getUnifiedManifestByPolicyId('123');
      expect(savedObjectsClient.find).toHaveBeenCalledWith({
        search: '123',
        type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE,
        searchFields: ['policyId'],
        namespaces: [UNIFIED_MANIFEST_ALL_NAMESPACES],
      });
    });

    test('can get all unified manifests', async () => {
      const getMockAgentPolicyFetchAllAgentPolicies = (items: InternalUnifiedManifestSchema[]) =>
        jest.fn(async function* (soClient: SavedObjectsClientContract) {
          const chunkSize = 1000; // Emulate paginated response
          for (let i = 0; i < items.length; i += chunkSize) {
            yield items.slice(i, i + chunkSize);
          }
        });

      unifiedManifestClient.fetchAllUnifiedManifests = getMockAgentPolicyFetchAllAgentPolicies(
        Array.from({ length: 2001 }, (_, i) => {
          return {
            ...mockUnifiedManifestAttributes({ policyId: `policy-${i}` }),
            id: `id-${i}`,
            created: '1',
          };
        })
      );

      const cbFunc = jest.fn();
      await unifiedManifestClient.getAllUnifiedManifests(cbFunc);

      expect(cbFunc).toHaveBeenCalledTimes(3);
      expect(cbFunc).toHaveBeenLastCalledWith([
        expect.objectContaining({ policyId: 'policy-2000', id: 'id-2000' }),
      ]);
    });
  });

  describe('Update methods', () => {
    const mockUnifiedManifest = (version = false) => ({
      id: '1234',
      ...mockUnifiedManifestAttributes(),
      ...(version && { version: 'abcd' }),
    });

    test('can update unified manifest', async () => {
      await unifiedManifestClient.updateUnifiedManifest(mockUnifiedManifest(), { version: 'abcd' });
      expect(savedObjectsClient.bulkUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          mockSoClientCallParams({ id: '1234', version: 'abcd' }, true, false),
        ]),
        { namespace: UNIFIED_MANIFEST_ALL_NAMESPACES }
      );
    });
    test('can update unified manifests', async () => {
      await unifiedManifestClient.updateUnifiedManifests([
        mockUnifiedManifest(true),
        mockUnifiedManifest(true),
      ]);
      expect(savedObjectsClient.bulkUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          mockSoClientCallParams({ id: '1234', version: 'abcd' }, true, false),
          mockSoClientCallParams({ id: '1234', version: 'abcd' }, true, false),
        ]),
        { namespace: UNIFIED_MANIFEST_ALL_NAMESPACES }
      );
    });
  });
  describe('Delete methods', () => {
    test('can delete unified manifest', async () => {
      await unifiedManifestClient.deleteUnifiedManifestById('123');
      expect(savedObjectsClient.bulkDelete).toHaveBeenCalledWith(
        expect.arrayContaining([{ id: '123', type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE }]),
        { namespace: UNIFIED_MANIFEST_ALL_NAMESPACES }
      );
    });
    test('can delete unified manifests', async () => {
      await unifiedManifestClient.deleteUnifiedManifestByIds(['123', '456']);
      expect(savedObjectsClient.bulkDelete).toHaveBeenCalledWith(
        expect.arrayContaining([
          mockSoClientCallParams({ id: '123' }, false),
          mockSoClientCallParams({ id: '456' }, false),
        ]),
        { namespace: UNIFIED_MANIFEST_ALL_NAMESPACES }
      );
    });
  });
  describe('Utility methods', () => {
    describe('fetchAllUnifiedManifests', () => {
      const soList = Array.from({ length: 2 }, () => ({
        updated_at: '2020-01-01T00:00:00.000Z',
      }));

      const createSOMock = (soResult?: []) => {
        return {
          saved_objects: !soResult
            ? soList.map((soAttributes) => {
                return {
                  score: 1,
                  id: 'so-123',
                  type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE,
                  version: 'abc',
                  updated_at: soAttributes.updated_at,
                  attributes: mockUnifiedManifestAttributes(),
                  references: [],
                  sort: ['created_at'],
                };
              })
            : soResult,
          total: soList.length,
          per_page: 10,
          page: 1,
          pit_id: 'pit-id-1',
        };
      };

      beforeEach(() => {
        savedObjectsClient.find.mockResolvedValueOnce(createSOMock());
        savedObjectsClient.find.mockResolvedValueOnce(createSOMock());
        savedObjectsClient.find.mockResolvedValueOnce(createSOMock([]));
      });

      test('should provide item ids on every iteration', async () => {
        for await (const items of unifiedManifestClient.fetchAllUnifiedManifests(
          savedObjectsClient
        )) {
          expect(items.map((item) => item.id)).toEqual(['so-123', 'so-123']);
        }

        expect(savedObjectsClient.find).toHaveBeenCalledTimes(3);
      });

      test('should use custom options when defined', async () => {
        for await (const items of unifiedManifestClient.fetchAllUnifiedManifests(
          savedObjectsClient,
          {
            kuery: 'one=two',
            perPage: 12,
            sortOrder: 'desc',
            sortField: 'updated_by',
          }
        )) {
          expect(items);
        }

        expect(savedObjectsClient.find).toHaveBeenCalledWith(
          expect.objectContaining({
            type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE,
            perPage: 12,
            sortField: 'updated_by',
            sortOrder: 'desc',
            filter: 'one=two',
          })
        );
      });
    });
  });
});
