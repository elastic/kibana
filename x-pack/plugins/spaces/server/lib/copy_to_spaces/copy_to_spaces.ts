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
import { SavedObjectsClientProviderOptions } from 'src/core/server';
import { spaceIdToNamespace } from '../utils/namespace';
import { CopyOptions, CopyResponse } from './types';
import { getEligibleTypes } from './lib/get_eligible_types';
import { createReadableStreamFromArray } from './lib/readable_stream_from_array';
import { createEmptyFailureResponse } from './lib/create_empty_failure_response';
import { readStreamToCompletion } from './lib/read_stream_to_completion';

export const COPY_TO_SPACES_SAVED_OBJECTS_CLIENT_OPTS: SavedObjectsClientProviderOptions = {
  excludedWrappers: ['spaces'],
};

export function copySavedObjectsToSpacesFactory(
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
      exportSizeLimit: importExport.objectLimit,
    });

    return readStreamToCompletion<SavedObject>(objectStream);
  };

  const importObjectsToSpace = async (
    spaceId: string,
    objectsStream: Readable,
    options: CopyOptions
  ) => {
    try {
      const importResponse = await importExport.importSavedObjects({
        namespace: spaceIdToNamespace(spaceId),
        objectLimit: importExport.objectLimit,
        overwrite: options.overwrite,
        savedObjectsClient,
        supportedTypes: eligibleTypes,
        readStream: objectsStream,
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

  const copySavedObjectsToSpaces = async (
    sourceSpaceId: string,
    destinationSpaceIds: string[],
    options: CopyOptions
  ): Promise<CopyResponse> => {
    const response: CopyResponse = {};

    const exportedSavedObjects = await exportRequestedObjects(sourceSpaceId, options);

    for (const spaceId of destinationSpaceIds) {
      response[spaceId] = await importObjectsToSpace(
        spaceId,
        createReadableStreamFromArray(exportedSavedObjects),
        options
      );
    }

    return response;
  };

  return copySavedObjectsToSpaces;
}
