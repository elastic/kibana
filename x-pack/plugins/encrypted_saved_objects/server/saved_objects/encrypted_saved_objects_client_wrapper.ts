/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import {
  SavedObject,
  SavedObjectsBaseOptions,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsCheckConflictsObject,
  SavedObjectsClientContract,
  SavedObjectsCreateOptions,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
  SavedObjectsAddToNamespacesOptions,
  SavedObjectsDeleteFromNamespacesOptions,
  ISavedObjectTypeRegistry,
} from 'src/core/server';
import { AuthenticatedUser } from '../../../security/common/model';
import { EncryptedSavedObjectsService } from '../crypto';
import { getDescriptorNamespace } from './get_descriptor_namespace';

interface EncryptedSavedObjectsClientOptions {
  baseClient: SavedObjectsClientContract;
  baseTypeRegistry: ISavedObjectTypeRegistry;
  service: Readonly<EncryptedSavedObjectsService>;
  getCurrentUser: () => AuthenticatedUser | undefined;
}

/**
 * Generates UUIDv4 ID for the any newly created saved object that is supposed to contain
 * encrypted attributes.
 */
function generateID() {
  return uuid.v4();
}

export class EncryptedSavedObjectsClientWrapper implements SavedObjectsClientContract {
  constructor(
    private readonly options: EncryptedSavedObjectsClientOptions,
    public readonly errors = options.baseClient.errors
  ) {}

  public async checkConflicts(
    objects: SavedObjectsCheckConflictsObject[] = [],
    options?: SavedObjectsBaseOptions
  ) {
    return await this.options.baseClient.checkConflicts(objects, options);
  }

  public async create<T>(
    type: string,
    attributes: T = {} as T,
    options: SavedObjectsCreateOptions = {}
  ) {
    if (!this.options.service.isRegistered(type)) {
      return await this.options.baseClient.create(type, attributes, options);
    }

    // Saved objects with encrypted attributes should have IDs that are hard to guess especially
    // since IDs are part of the AAD used during encryption, that's why we control them within this
    // wrapper and don't allow consumers to specify their own IDs directly.

    // only allow a specified ID if we're overwriting an existing ESO with a Version
    // this helps us ensure that the document really was previously created using ESO
    // and not being used to get around the specified ID limitation
    const canSpecifyID = options.overwrite && options.version;
    if (options.id && !canSpecifyID) {
      throw new Error(
        'Predefined IDs are not allowed for saved objects with encrypted attributes.'
      );
    }

    const id = options.id ?? generateID();
    const namespace = getDescriptorNamespace(
      this.options.baseTypeRegistry,
      type,
      options.namespace
    );
    return await this.handleEncryptedAttributesInResponse(
      await this.options.baseClient.create(
        type,
        (await this.options.service.encryptAttributes(
          { type, id, namespace },
          attributes as Record<string, unknown>,
          { user: this.options.getCurrentUser() }
        )) as T,
        { ...options, id }
      ),
      attributes,
      namespace
    );
  }

  public async bulkCreate<T>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options?: SavedObjectsBaseOptions & Pick<SavedObjectsCreateOptions, 'overwrite'>
  ) {
    // We encrypt attributes for every object in parallel and that can potentially exhaust libuv or
    // NodeJS thread pool. If it turns out to be a problem, we can consider switching to the
    // sequential processing.
    const encryptedObjects = await Promise.all(
      objects.map(async (object) => {
        if (!this.options.service.isRegistered(object.type)) {
          return object;
        }

        // Saved objects with encrypted attributes should have IDs that are hard to guess especially
        // since IDs are part of the AAD used during encryption, that's why we control them within this
        // wrapper and don't allow consumers to specify their own IDs directly unless overwriting the original document.
        const canSpecifyID = options?.overwrite && object.version;
        if (object.id && !canSpecifyID) {
          throw new Error(
            'Predefined IDs are not allowed for saved objects with encrypted attributes.'
          );
        }

        const id = object.id ?? generateID();
        const namespace = getDescriptorNamespace(
          this.options.baseTypeRegistry,
          object.type,
          options?.namespace
        );
        return {
          ...object,
          id,
          attributes: await this.options.service.encryptAttributes(
            { type: object.type, id, namespace },
            object.attributes as Record<string, unknown>,
            { user: this.options.getCurrentUser() }
          ),
        } as SavedObjectsBulkCreateObject<T>;
      })
    );

    return await this.handleEncryptedAttributesInBulkResponse(
      await this.options.baseClient.bulkCreate<T>(encryptedObjects, options),
      objects
    );
  }

  public async bulkUpdate<T>(
    objects: Array<SavedObjectsBulkUpdateObject<T>>,
    options?: SavedObjectsBaseOptions
  ) {
    // We encrypt attributes for every object in parallel and that can potentially exhaust libuv or
    // NodeJS thread pool. If it turns out to be a problem, we can consider switching to the
    // sequential processing.
    const encryptedObjects = await Promise.all(
      objects.map(async (object) => {
        const { type, id, attributes, namespace: objectNamespace } = object;
        if (!this.options.service.isRegistered(type)) {
          return object;
        }
        const namespace = getDescriptorNamespace(
          this.options.baseTypeRegistry,
          type,
          objectNamespace ?? options?.namespace
        );
        return {
          ...object,
          attributes: await this.options.service.encryptAttributes(
            { type, id, namespace },
            attributes,
            { user: this.options.getCurrentUser() }
          ),
        };
      })
    );

    return await this.handleEncryptedAttributesInBulkResponse(
      await this.options.baseClient.bulkUpdate(encryptedObjects, options),
      objects
    );
  }

  public async delete(type: string, id: string, options?: SavedObjectsBaseOptions) {
    return await this.options.baseClient.delete(type, id, options);
  }

  public async find<T>(options: SavedObjectsFindOptions) {
    return await this.handleEncryptedAttributesInBulkResponse(
      await this.options.baseClient.find<T>(options),
      undefined
    );
  }

  public async bulkGet<T>(
    objects: SavedObjectsBulkGetObject[] = [],
    options?: SavedObjectsBaseOptions
  ) {
    return await this.handleEncryptedAttributesInBulkResponse(
      await this.options.baseClient.bulkGet<T>(objects, options),
      undefined
    );
  }

  public async get<T>(type: string, id: string, options?: SavedObjectsBaseOptions) {
    return await this.handleEncryptedAttributesInResponse(
      await this.options.baseClient.get<T>(type, id, options),
      undefined as unknown,
      getDescriptorNamespace(this.options.baseTypeRegistry, type, options?.namespace)
    );
  }

  public async update<T>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options?: SavedObjectsUpdateOptions
  ) {
    if (!this.options.service.isRegistered(type)) {
      return await this.options.baseClient.update(type, id, attributes, options);
    }
    const namespace = getDescriptorNamespace(
      this.options.baseTypeRegistry,
      type,
      options?.namespace
    );
    return this.handleEncryptedAttributesInResponse(
      await this.options.baseClient.update(
        type,
        id,
        await this.options.service.encryptAttributes({ type, id, namespace }, attributes, {
          user: this.options.getCurrentUser(),
        }),
        options
      ),
      attributes,
      namespace
    );
  }

  public async addToNamespaces(
    type: string,
    id: string,
    namespaces: string[],
    options?: SavedObjectsAddToNamespacesOptions
  ) {
    return await this.options.baseClient.addToNamespaces(type, id, namespaces, options);
  }

  public async deleteFromNamespaces(
    type: string,
    id: string,
    namespaces: string[],
    options?: SavedObjectsDeleteFromNamespacesOptions
  ) {
    return await this.options.baseClient.deleteFromNamespaces(type, id, namespaces, options);
  }

  /**
   * Strips encrypted attributes from any non-bulk Saved Objects API response. If type isn't
   * registered, response is returned as is.
   * @param response Raw response returned by the underlying base client.
   * @param [originalAttributes] Optional list of original attributes of the saved object.
   * @param [namespace] Optional namespace that was used for the saved objects operation.
   */
  private async handleEncryptedAttributesInResponse<
    T,
    R extends SavedObjectsUpdateResponse<T> | SavedObject<T>
  >(response: R, originalAttributes?: T, namespace?: string): Promise<R> {
    if (response.attributes && this.options.service.isRegistered(response.type)) {
      // Error is returned when decryption fails, and in this case encrypted attributes will be
      // stripped from the returned attributes collection. That will let consumer decide whether to
      // fail or handle recovery gracefully.
      const { attributes, error } = await this.options.service.stripOrDecryptAttributes(
        { id: response.id, type: response.type, namespace },
        response.attributes as Record<string, unknown>,
        originalAttributes as Record<string, unknown>,
        { user: this.options.getCurrentUser() }
      );

      response.attributes = attributes as T;
      if (error) {
        response.error = error as any;
      }
    }

    return response;
  }

  /**
   * Strips encrypted attributes from any bulk Saved Objects API response. If type for any bulk
   * response portion isn't registered, it is returned as is.
   * @param response Raw response returned by the underlying base client.
   * @param [objects] Optional list of saved objects with original attributes.
   */
  private async handleEncryptedAttributesInBulkResponse<
    T,
    R extends
      | SavedObjectsBulkResponse<T>
      | SavedObjectsFindResponse<T>
      | SavedObjectsBulkUpdateResponse<T>,
    O extends Array<SavedObjectsBulkCreateObject<T>> | Array<SavedObjectsBulkUpdateObject<T>>
  >(response: R, objects?: O) {
    for (const [index, savedObject] of response.saved_objects.entries()) {
      await this.handleEncryptedAttributesInResponse(
        savedObject,
        objects?.[index].attributes ?? undefined,
        getDescriptorNamespace(
          this.options.baseTypeRegistry,
          savedObject.type,
          savedObject.namespaces ? savedObject.namespaces[0] : undefined
        )
      );
    }

    return response;
  }
}
