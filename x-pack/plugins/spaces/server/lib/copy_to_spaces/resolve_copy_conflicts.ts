/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';
import { SavedObject, CoreStart, KibanaRequest, SavedObjectsImportRetry } from 'src/core/server';
import { spaceIdToNamespace } from '../utils/namespace';
import { CopyOptions, ResolveConflictsOptions, CopyResponse } from './types';
import { createEmptyFailureResponse } from './lib/create_empty_failure_response';
import { readStreamToCompletion } from './lib/read_stream_to_completion';
import { createReadableStreamFromArray } from './lib/readable_stream_from_array';
import { COPY_TO_SPACES_SAVED_OBJECTS_CLIENT_OPTS } from './lib/saved_objects_client_opts';
import { getIneligibleTypes } from './lib/get_ineligible_types';

export function resolveCopySavedObjectsToSpacesConflictsFactory(
  savedObjects: CoreStart['savedObjects'],
  request: KibanaRequest
) {
  const { getTypeRegistry, getScopedClient, createExporter, createImporter } = savedObjects;

  const savedObjectsClient = getScopedClient(request, COPY_TO_SPACES_SAVED_OBJECTS_CLIENT_OPTS);
  const savedObjectsExporter = createExporter(savedObjectsClient);
  const savedObjectsImporter = createImporter(savedObjectsClient);

  const exportRequestedObjects = async (
    sourceSpaceId: string,
    options: Pick<CopyOptions, 'includeReferences' | 'objects'>
  ) => {
    const objectStream = await savedObjectsExporter.exportByObjects({
      namespace: spaceIdToNamespace(sourceSpaceId),
      includeReferencesDeep: options.includeReferences,
      excludeExportDetails: true,
      objects: options.objects,
    });
    return readStreamToCompletion<SavedObject>(objectStream);
  };

  const resolveConflictsForSpace = async (
    spaceId: string,
    objectsStream: Readable,
    retries: SavedObjectsImportRetry[],
    createNewCopies: boolean
  ) => {
    try {
      const importResponse = await savedObjectsImporter.resolveImportErrors({
        namespace: spaceIdToNamespace(spaceId),
        readStream: objectsStream,
        retries,
        createNewCopies,
      });

      return {
        success: importResponse.success,
        successCount: importResponse.successCount,
        successResults: importResponse.successResults,
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
    const ineligibleTypes = getIneligibleTypes(getTypeRegistry());
    const filteredObjects = exportedSavedObjects.filter(
      ({ type }) => !ineligibleTypes.includes(type)
    );

    for (const entry of Object.entries(options.retries)) {
      const [spaceId, entryRetries] = entry;

      const retries = entryRetries.map((retry) => ({ ...retry, replaceReferences: [] }));

      response[spaceId] = await resolveConflictsForSpace(
        spaceId,
        createReadableStreamFromArray(filteredObjects),
        retries,
        options.createNewCopies
      );
    }

    return response;
  };

  return resolveCopySavedObjectsToSpacesConflicts;
}
