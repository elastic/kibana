/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  StartServicesAccessor,
  SavedObject,
  SavedObjectsBaseOptions,
  SavedObjectsServiceSetup,
} from 'src/core/server';
import { EncryptedSavedObjectsService } from '../crypto';
import { EncryptedSavedObjectsClientWrapper } from './encrypted_saved_objects_client_wrapper';

interface SetupSavedObjectsParams {
  service: PublicMethodsOf<EncryptedSavedObjectsService>;
  savedObjects: SavedObjectsServiceSetup;
  getStartServices: StartServicesAccessor;
}

export interface SavedObjectsSetup {
  getDecryptedAsInternalUser: <T = unknown>(
    type: string,
    id: string,
    options?: SavedObjectsBaseOptions
  ) => Promise<SavedObject<T>>;
}

export function setupSavedObjects({
  service,
  savedObjects,
  getStartServices,
}: SetupSavedObjectsParams): SavedObjectsSetup {
  // Register custom saved object client that will encrypt, decrypt and strip saved object
  // attributes where appropriate for any saved object repository request. We choose max possible
  // priority for this wrapper to allow all other wrappers to set proper `namespace` for the Saved
  // Object (e.g. wrapper registered by the Spaces plugin) before we encrypt attributes since
  // `namespace` is included into AAD.
  savedObjects.addClientWrapper(
    Number.MAX_SAFE_INTEGER,
    'encryptedSavedObjects',
    ({ client: baseClient, typeRegistry: baseTypeRegistry }) =>
      new EncryptedSavedObjectsClientWrapper({ baseClient, baseTypeRegistry, service })
  );

  const internalRepositoryPromise = getStartServices().then(([core]) =>
    core.savedObjects.createInternalRepository()
  );
  return {
    getDecryptedAsInternalUser: async <T = unknown>(
      type: string,
      id: string,
      options?: SavedObjectsBaseOptions
    ): Promise<SavedObject<T>> => {
      const internalRepository = await internalRepositoryPromise;
      const savedObject = await internalRepository.get(type, id, options);
      return {
        ...savedObject,
        attributes: (await service.decryptAttributes(
          { type, id, namespace: options && options.namespace },
          savedObject.attributes as Record<string, unknown>
        )) as T,
      };
    },
  };
}
