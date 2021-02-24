/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, KibanaRequest, CoreStart } from 'src/core/server';
import { Readable } from 'stream';
import { spaceIdToNamespace } from '../utils/namespace';
import { CopyOptions, CopyResponse } from './types';
import { createReadableStreamFromArray } from './lib/readable_stream_from_array';
import { createEmptyFailureResponse } from './lib/create_empty_failure_response';
import { readStreamToCompletion } from './lib/read_stream_to_completion';
import { COPY_TO_SPACES_SAVED_OBJECTS_CLIENT_OPTS } from './lib/saved_objects_client_opts';
import { getIneligibleTypes } from './lib/get_ineligible_types';

export function copySavedObjectsToSpacesFactory(
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
      request,
      namespace: spaceIdToNamespace(sourceSpaceId),
      includeReferencesDeep: options.includeReferences,
      excludeExportDetails: true,
      objects: options.objects,
    });

    return readStreamToCompletion<SavedObject>(objectStream);
  };

  const importObjectsToSpace = async (
    spaceId: string,
    objectsStream: Readable,
    options: CopyOptions
  ) => {
    try {
      const importResponse = await savedObjectsImporter.import({
        namespace: spaceIdToNamespace(spaceId),
        overwrite: options.overwrite,
        readStream: objectsStream,
        createNewCopies: options.createNewCopies,
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

  const copySavedObjectsToSpaces = async (
    sourceSpaceId: string,
    destinationSpaceIds: string[],
    options: CopyOptions
  ): Promise<CopyResponse> => {
    const response: CopyResponse = {};

    const exportedSavedObjects = await exportRequestedObjects(sourceSpaceId, options);
    const ineligibleTypes = getIneligibleTypes(getTypeRegistry());
    const filteredObjects = exportedSavedObjects.filter(
      ({ type }) => !ineligibleTypes.includes(type)
    );

    for (const spaceId of destinationSpaceIds) {
      response[spaceId] = await importObjectsToSpace(
        spaceId,
        createReadableStreamFromArray(filteredObjects),
        options
      );
    }

    return response;
  };

  return copySavedObjectsToSpaces;
}
