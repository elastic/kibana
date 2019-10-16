/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsLegacyService,
  SavedObject,
} from 'src/core/server';
import { Readable } from 'stream';
import { spaceIdToNamespace } from '../utils/namespace';
import { CopyOptions, ResolveConflictsOptions, CopyResponse } from './types';
import { getEligibleTypes } from './lib/get_eligible_types';
import { createEmptyFailureResponse } from './lib/create_empty_failure_response';
import { readStreamToCompletion } from './lib/read_stream_to_completion';
import { createReadableStreamFromArray } from './lib/readable_stream_from_array';

export function resolveCopySavedObjectsToSpacesConflictsFactory(
  savedObjectsClient: SavedObjectsClientContract,
  savedObjectsService: SavedObjectsLegacyService
) {
  const { importExport, types, schema } = savedObjectsService;
  const eligibleTypes = getEligibleTypes({ types, schema });

  const exportRequestedObjects = async (
    sourceSpaceId: string,
    options: Pick<CopyOptions, 'includeReferences' | 'objects'>
  ) => {
    const objectStream = await importExport.getSortedObjectsForExport({
      namespace: spaceIdToNamespace(sourceSpaceId),
      includeReferencesDeep: options.includeReferences,
      excludeExportDetails: true,
      objects: options.objects,
      savedObjectsClient,
      types: eligibleTypes,
      exportSizeLimit: importExport.objectLimit,
    });
    return readStreamToCompletion<SavedObject>(objectStream);
  };

  const resolveConflictsForSpace = async (
    spaceId: string,
    objectsStream: Readable,
    retries: Array<{
      type: string;
      id: string;
      overwrite: boolean;
      replaceReferences: Array<{ type: string; from: string; to: string }>;
    }>
  ) => {
    try {
      const importResponse = await importExport.resolveImportErrors({
        namespace: spaceIdToNamespace(spaceId),
        objectLimit: importExport.objectLimit,
        savedObjectsClient,
        supportedTypes: eligibleTypes,
        readStream: objectsStream,
        retries,
      });

      return {
        success: importResponse.success,
        successCount: importResponse.successCount,
        errors: importResponse.errors,
      };
    } catch (error) {
      return createEmptyFailureResponse([error]);
    }
  };

  const resolveCopySavedObjectsToSpacesConflicts = async (
    sourceSpaceId: string,
    options: ResolveConflictsOptions
  ): Promise<CopyResponse> => {
    const response: CopyResponse = {};

    const exportedSavedObjects = await exportRequestedObjects(sourceSpaceId, {
      includeReferences: options.includeReferences,
      objects: options.objects,
    });

    for (const entry of Object.entries(options.retries)) {
      const [spaceId, entryRetries] = entry;

      const retries = entryRetries.map(retry => ({ ...retry, replaceReferences: [] }));

      response[spaceId] = await resolveConflictsForSpace(
        spaceId,
        createReadableStreamFromArray(exportedSavedObjects),
        retries
      );
    }

    return response;
  };

  return resolveCopySavedObjectsToSpacesConflicts;
}
