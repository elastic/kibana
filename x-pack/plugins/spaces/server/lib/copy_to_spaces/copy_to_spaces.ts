/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ImportError } from 'src/legacy/server/saved_objects/import/types';
import { SavedObjectsService, SavedObjectsClient } from 'src/legacy/server/kbn_server';
import { SpacesClient } from '../spaces_client';
import { InMemoryReadStream } from './in_memory_read_stream';

interface CopyOptions {
  objects: Array<{ type: string; id: string }>;
  overwrite: boolean;
  includeReferences: boolean;
}

interface SpaceNotFoundError {
  type: 'space_not_found';
  spaceId: string;
}

interface CopyToSpaceError {
  error: SpaceNotFoundError;
}

interface CopyResponse {
  [spaceId: string]: {
    success: boolean;
    successCount: number;
    errors?: Array<ImportError | CopyToSpaceError>;
  };
}

export function copySavedObjectsToSpacesFactory(
  spacesClient: SpacesClient,
  savedObjectsClient: SavedObjectsClient,
  savedObjectsService: SavedObjectsService
) {
  const { importExport, types, schema } = savedObjectsService;
  const eligibleTypes = types.filter(type => !schema.isNamespaceAgnostic(type));

  const createEmptyFailureResponse = (errors?: Array<ImportError | CopyToSpaceError>) => ({
    success: false,
    successCount: 0,
    errors,
  });

  const exportRequestedObjectsToNdjson = async (options: CopyOptions) => {
    const objects = await importExport.getSortedObjectsForExport({
      includeReferencesDeep: options.includeReferences,
      objects: options.objects,
      savedObjectsClient,
      types: eligibleTypes,
      exportSizeLimit: 10000,
    });
    return importExport.objectsToNdJson(objects);
  };

  const importObjectsToSpace = async (
    spaceId: string,
    objectsInNdJson: string,
    options: CopyOptions
  ) => {
    try {
      const canImport = await canImportIntoSpace(spaceId, spacesClient);

      if (!canImport) {
        return createEmptyFailureResponse([{ error: { type: 'space_not_found', spaceId } }]);
      }

      const importResponse = await importExport.importSavedObjects({
        namespace: spaceId,
        objectLimit: 10000,
        overwrite: options.overwrite,
        savedObjectsClient,
        supportedTypes: eligibleTypes,
        readStream: new InMemoryReadStream(objectsInNdJson),
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

  return async function copySavedObjectsToSpaces(
    spaces: string[],
    options: CopyOptions
  ): Promise<CopyResponse> {
    const response: CopyResponse = {};

    const objectsInNdJson = await exportRequestedObjectsToNdjson(options);

    for (const spaceId of spaces) {
      response[spaceId] = await importObjectsToSpace(spaceId, objectsInNdJson, options);
    }

    return response;
  };
}

async function canImportIntoSpace(spaceId: string, spacesClient: SpacesClient): Promise<boolean> {
  try {
    const [, canManage] = await Promise.all([
      spacesClient.get(spaceId),
      spacesClient.canManageSavedObjects(spaceId),
    ]);

    return canManage;
  } catch (error) {
    return false;
  }
}
