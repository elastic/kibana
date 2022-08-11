/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';

import type { CoreStart, KibanaRequest, SavedObject } from '@kbn/core/server';

import { ALL_SPACES_ID } from '../../../common/constants';
import { spaceIdToNamespace } from '../utils/namespace';
import { createEmptyFailureResponse } from './lib/create_empty_failure_response';
import { getIneligibleTypes } from './lib/get_ineligible_types';
import { readStreamToCompletion } from './lib/read_stream_to_completion';
import { createReadableStreamFromArray } from './lib/readable_stream_from_array';
import { COPY_TO_SPACES_SAVED_OBJECTS_CLIENT_OPTS } from './lib/saved_objects_client_opts';
import type { CopyOptions, CopyResponse } from './types';

export function copySavedObjectsToSpacesFactory(
  savedObjects: CoreStart['savedObjects'],
  request: KibanaRequest
) {
  const { getTypeRegistry, getScopedClient, createExporter, createImporter } = savedObjects;

  const savedObjectsClient = getScopedClient(request, COPY_TO_SPACES_SAVED_OBJECTS_CLIENT_OPTS);
  const savedObjectsExporter = createExporter(savedObjectsClient);
  const savedObjectsImporter = createImporter(savedObjectsClient);

  const exportRequestedObjects = async (sourceSpaceId: string, options: CopyOptions) => {
    const objectStream = await savedObjectsExporter.exportByObjects({
      request,
      namespace: spaceIdToNamespace(sourceSpaceId),
      includeReferencesDeep: options.includeReferences,
      includeNamespaces: !options.createNewCopies, // if we are not creating new copies, then include namespaces; this will ensure we can check for objects that already exist in the destination space below
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
      ({ type, namespaces }) =>
        // Don't attempt to copy ineligible types or objects that already exist in all spaces
        !ineligibleTypes.includes(type) && !namespaces?.includes(ALL_SPACES_ID)
    );

    for (const spaceId of destinationSpaceIds) {
      const objectsToImport: SavedObject[] = [];
      for (const { namespaces, ...object } of filteredObjects) {
        if (!namespaces?.includes(spaceId)) {
          // We check to ensure that each object doesn't already exist in the destination. If we don't do this, the consumer will see a
          // conflict and have the option to skip or overwrite the object, both of which are effectively a no-op.
          objectsToImport.push(object);
        }
      }
      response[spaceId] = await importObjectsToSpace(
        spaceId,
        createReadableStreamFromArray(objectsToImport),
        options
      );
    }

    return response;
  };

  return copySavedObjectsToSpaces;
}
