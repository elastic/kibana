/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsBulkDeleteResponse,
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core-saved-objects-api-server';
import { createSoFindIterable } from '../../utils/create_so_find_iterable';
import { mapUnifiedManifestSavedObjectToUnifiedManifest } from './utils';
import type {
  InternalUnifiedManifestBaseSchema,
  InternalUnifiedManifestSchema,
  InternalUnifiedManifestUpdateSchema,
} from '../../schemas';
import { ManifestConstants } from '../../lib/artifacts';
import { normalizeKuery } from '../../utils/normalize_kuery';

interface FetchAllUnifiedManifestsOptions {
  perPage?: number;
  kuery?: string;
  sortField?: string;
  sortOrder?: 'desc' | 'asc';
  fields?: string[];
}

export const UNIFIED_MANIFEST_ALL_NAMESPACES = '*';

export class UnifiedManifestClient {
  private savedObjectsClient: SavedObjectsClientContract;

  constructor(savedObjectsClient: SavedObjectsClientContract) {
    this.savedObjectsClient = savedObjectsClient;
  }

  /**
   * Create
   */

  public createUnifiedManifest(
    manifest: InternalUnifiedManifestBaseSchema
  ): Promise<SavedObjectsBulkResponse<InternalUnifiedManifestBaseSchema>> {
    return this.createUnifiedManifests([manifest]);
  }

  public createUnifiedManifests(
    manifests: InternalUnifiedManifestBaseSchema[]
  ): Promise<SavedObjectsBulkResponse<InternalUnifiedManifestBaseSchema>> {
    return this.savedObjectsClient.bulkCreate<InternalUnifiedManifestBaseSchema>(
      manifests.map((attributes) => ({
        type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE,
        attributes,
      })),
      { initialNamespaces: [UNIFIED_MANIFEST_ALL_NAMESPACES] }
    );
  }

  /**
   * Read
   */

  public getUnifiedManifestByPolicyId(
    policyId: string
  ): Promise<SavedObjectsFindResponse<InternalUnifiedManifestSchema>> {
    return this.savedObjectsClient.find({
      type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE,
      search: policyId,
      searchFields: ['policyId'],
      namespaces: [UNIFIED_MANIFEST_ALL_NAMESPACES],
    });
  }

  public getUnifiedManifestById(
    manifestId: string
  ): Promise<SavedObjectsBulkResponse<InternalUnifiedManifestSchema>> {
    return this.getUnifiedManifestByIds([manifestId]);
  }

  public getUnifiedManifestByIds(
    manifestIds: string[]
  ): Promise<SavedObjectsBulkResponse<InternalUnifiedManifestSchema>> {
    return this.savedObjectsClient.bulkGet(
      manifestIds.map((id) => ({ id, type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE })),
      { namespace: UNIFIED_MANIFEST_ALL_NAMESPACES }
    );
  }

  public async getAllUnifiedManifests(
    cb: (unifiedManifests: InternalUnifiedManifestSchema[]) => void | Promise<void>,
    options?: FetchAllUnifiedManifestsOptions
  ): Promise<void> {
    const unifiedManifestsFetcher = this.fetchAllUnifiedManifests(this.savedObjectsClient, options);

    for await (const unifiedManifests of unifiedManifestsFetcher) {
      if (cb.constructor.name === 'AsyncFunction') {
        await cb(unifiedManifests);
      } else {
        cb(unifiedManifests);
      }
    }
  }

  /**
   * Update
   */

  public updateUnifiedManifest(
    manifest: InternalUnifiedManifestUpdateSchema,
    opts?: { version: string }
  ): Promise<SavedObjectsBulkUpdateResponse<InternalUnifiedManifestSchema>> {
    return this.updateUnifiedManifests([
      { ...manifest, ...(opts?.version ? { version: opts.version } : {}) },
    ]);
  }

  public updateUnifiedManifests(
    manifests: Array<InternalUnifiedManifestUpdateSchema & { version?: string }>
  ): Promise<SavedObjectsBulkUpdateResponse<InternalUnifiedManifestSchema>> {
    return this.savedObjectsClient.bulkUpdate<InternalUnifiedManifestBaseSchema>(
      manifests.map((manifest) => {
        const { id, version, ...attributes } = manifest;
        return {
          type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE,
          id,
          attributes,
          ...(version ? { version } : {}),
        };
      }),
      { namespace: UNIFIED_MANIFEST_ALL_NAMESPACES }
    );
  }

  /**
   * Delete
   */

  public deleteUnifiedManifestById(manifestId: string): Promise<SavedObjectsBulkDeleteResponse> {
    return this.deleteUnifiedManifestByIds([manifestId]);
  }

  public deleteUnifiedManifestByIds(
    manifestIds: string[]
  ): Promise<SavedObjectsBulkDeleteResponse> {
    return this.savedObjectsClient.bulkDelete(
      manifestIds.map((id) => ({ id, type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE })),
      { namespace: UNIFIED_MANIFEST_ALL_NAMESPACES }
    );
  }

  /**
   * Utils
   */

  public fetchAllUnifiedManifests(
    soClient: SavedObjectsClientContract,
    {
      perPage = 1000,
      fields = [],
      kuery,
      sortOrder = 'asc',
      sortField = 'created',
    }: FetchAllUnifiedManifestsOptions = {}
  ): AsyncIterable<InternalUnifiedManifestSchema[]> {
    return createSoFindIterable<InternalUnifiedManifestBaseSchema>({
      soClient,
      findRequest: {
        type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE,
        perPage,
        filter: kuery
          ? normalizeKuery(ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE, kuery)
          : undefined,
        sortOrder,
        sortField,
        fields,
        namespaces: [UNIFIED_MANIFEST_ALL_NAMESPACES],
      },
      resultsMapper(results) {
        return results.saved_objects.map(mapUnifiedManifestSavedObjectToUnifiedManifest);
      },
    });
  }
}
