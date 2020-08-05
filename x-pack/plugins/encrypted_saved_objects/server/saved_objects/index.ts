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
  ISavedObjectsRepository,
  ISavedObjectTypeRegistry,
} from 'src/core/server';
import { SecurityPluginSetup } from '../../../security/server';
import { EncryptedSavedObjectsService } from '../crypto';
import { EncryptedSavedObjectsClientWrapper } from './encrypted_saved_objects_client_wrapper';
import { getDescriptorNamespace } from './get_descriptor_namespace';

interface SetupSavedObjectsParams {
  service: PublicMethodsOf<EncryptedSavedObjectsService>;
  savedObjects: SavedObjectsServiceSetup;
  security?: SecurityPluginSetup;
  getStartServices: StartServicesAccessor;
}

export type ClientInstanciator = (
  options?: EncryptedSavedObjectsClientOptions
) => EncryptedSavedObjectsClient;

export interface EncryptedSavedObjectsClientOptions {
  includedHiddenTypes?: string[];
}

export interface EncryptedSavedObjectsClient {
  getDecryptedAsInternalUser: <T = unknown>(
    type: string,
    id: string,
    options?: SavedObjectsBaseOptions
  ) => Promise<SavedObject<T>>;
}

export function setupSavedObjects({
  service,
  savedObjects,
  security,
  getStartServices,
}: SetupSavedObjectsParams): ClientInstanciator {
  // Register custom saved object client that will encrypt, decrypt and strip saved object
  // attributes where appropriate for any saved object repository request. We choose max possible
  // priority for this wrapper to allow all other wrappers to set proper `namespace` for the Saved
  // Object (e.g. wrapper registered by the Spaces plugin) before we encrypt attributes since
  // `namespace` is included into AAD.
  savedObjects.addClientWrapper(
    Number.MAX_SAFE_INTEGER,
    'encryptedSavedObjects',
    ({ client: baseClient, typeRegistry: baseTypeRegistry, request }) =>
      new EncryptedSavedObjectsClientWrapper({
        baseClient,
        baseTypeRegistry,
        service,
        getCurrentUser: () => security?.authc.getCurrentUser(request) ?? undefined,
      })
  );

  return (clientOpts) => {
    const internalRepositoryAndTypeRegistryPromise = getStartServices().then(
      ([core]) =>
        [
          core.savedObjects.createInternalRepository(clientOpts?.includedHiddenTypes),
          core.savedObjects.getTypeRegistry(),
        ] as [ISavedObjectsRepository, ISavedObjectTypeRegistry]
    );
    return {
      getDecryptedAsInternalUser: async <T = unknown>(
        type: string,
        id: string,
        options?: SavedObjectsBaseOptions
      ): Promise<SavedObject<T>> => {
        const [internalRepository, typeRegistry] = await internalRepositoryAndTypeRegistryPromise;
        const savedObject = await internalRepository.get(type, id, options);
        return {
          ...savedObject,
          attributes: (await service.decryptAttributes(
            {
              type,
              id,
              namespace: getDescriptorNamespace(typeRegistry, type, options?.namespace),
            },
            savedObject.attributes as Record<string, unknown>
          )) as T,
        };
      },
    };
  };
}
