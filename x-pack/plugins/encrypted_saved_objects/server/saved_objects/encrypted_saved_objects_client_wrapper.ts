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
import { EncryptedSavedObjectsService } from '../crypto';

interface EncryptedSavedObjectsClientOptions {
  baseClient: SavedObjectsClientContract;
  baseTypeRegistry: ISavedObjectTypeRegistry;
  service: Readonly<EncryptedSavedObjectsService>;
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

  // only include namespace in AAD descriptor if the specified type is single-namespace
  private getDescriptorNamespace = (type: string, namespace?: string) =>
    this.options.baseTypeRegistry.isSingleNamespace(type) ? namespace : undefined;

  public async create<T = unknown>(
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
    if (options.id) {
      throw new Error(
        'Predefined IDs are not allowed for saved objects with encrypted attributes.'
      );
    }

    const id = generateID();
    const namespace = this.getDescriptorNamespace(type, options.namespace);
    return (await this.handleEncryptedAttributesInResponse(
      this.stripEncryptedAttributesFromResponse(
        await this.options.baseClient.create(
          type,
          await this.options.service.encryptAttributes(
            { type, id, namespace },
            attributes as Record<string, unknown>
          ),
          { ...options, id }
        )
      ),
      namespace,
      attributes
    )) as SavedObject<T>;
  }

  public async bulkCreate<T = unknown>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options?: SavedObjectsBaseOptions
  ) {
    // We encrypt attributes for every object in parallel and that can potentially exhaust libuv or
    // NodeJS thread pool. If it turns out to be a problem, we can consider switching to the
    // sequential processing.
    const encryptedObjects = await Promise.all(
      objects.map(async object => {
        if (!this.options.service.isRegistered(object.type)) {
          return object;
        }

        // Saved objects with encrypted attributes should have IDs that are hard to guess especially
        // since IDs are part of the AAD used during encryption, that's why we control them within this
        // wrapper and don't allow consumers to specify their own IDs directly.
        if (object.id) {
          throw new Error(
            'Predefined IDs are not allowed for saved objects with encrypted attributes.'
          );
        }

        const id = generateID();
        const namespace = this.getDescriptorNamespace(object.type, options?.namespace);
        return {
          ...object,
          id,
          attributes: await this.options.service.encryptAttributes(
            { type: object.type, id, namespace },
            object.attributes as Record<string, unknown>
          ),
        } as SavedObjectsBulkCreateObject<T>;
      })
    );

    return await this.stripEncryptedAttributesFromBulkResponse(
      await this.options.baseClient.bulkCreate<T>(encryptedObjects, options),
      namespace,
      objects
    );
  }

  public async bulkUpdate(
    objects: SavedObjectsBulkUpdateObject[],
    options?: SavedObjectsBaseOptions
  ) {
    // We encrypt attributes for every object in parallel and that can potentially exhaust libuv or
    // NodeJS thread pool. If it turns out to be a problem, we can consider switching to the
    // sequential processing.
    const encryptedObjects = await Promise.all(
      objects.map(async object => {
        const { type, id, attributes } = object;
        if (!this.options.service.isRegistered(type)) {
          return object;
        }
        const namespace = this.getDescriptorNamespace(type, options?.namespace);
        return {
          ...object,
          attributes: await this.options.service.encryptAttributes(
            { type, id, namespace },
            attributes
          ),
        };
      })
    );

    return await this.stripEncryptedAttributesFromBulkResponse(
      await this.options.baseClient.bulkUpdate(encryptedObjects, options),
      options?.namespace,
      objects
    );
  }

  public async delete(type: string, id: string, options?: SavedObjectsBaseOptions) {
    return await this.options.baseClient.delete(type, id, options);
  }

  public async find<T = unknown>(options: SavedObjectsFindOptions) {
    return await this.stripEncryptedAttributesFromBulkResponse(
      await this.options.baseClient.find<T>(options),
      this.getDescriptorNamespace(type, options.namespace)
    );
  }

  public async bulkGet<T = unknown>(
    objects: SavedObjectsBulkGetObject[] = [],
    options?: SavedObjectsBaseOptions
  ) {
    return await this.stripEncryptedAttributesFromBulkResponse(
      await this.options.baseClient.bulkGet<T>(objects, options),
      this.getDescriptorNamespace(type, options.namespace)
    );
  }

  public async get<T = unknown>(type: string, id: string, options?: SavedObjectsBaseOptions) {
    return await this.handleEncryptedAttributesInResponse(
      await this.options.baseClient.get<T>(type, id, options),
      this.getDescriptorNamespace(type, options.namespace)
    );
  }

  public async update<T = unknown>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options?: SavedObjectsUpdateOptions
  ) {
    if (!this.options.service.isRegistered(type)) {
      return await this.options.baseClient.update(type, id, attributes, options);
    }
    const namespace = this.getDescriptorNamespace(type, options?.namespace);
    return this.handleEncryptedAttributesInResponse(
      await this.options.baseClient.update(
        type,
        id,
        await this.options.service.encryptAttributes({ type, id, namespace }, attributes),
        options
      ),
      namespace,
      attributes
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
   */
  private async handleEncryptedAttributesInResponse<
    R extends SavedObjectsUpdateResponse | SavedObject,
    A extends SavedObjectAttributes
  >(response: R, namespace: string | undefined, originalAttributes?: A): Promise<R> {
    if (this.options.service.isRegistered(response.type) && response.attributes) {
      response.attributes = await this.options.service.handleEncryptedAttributes(
        response.type,
        response.id,
        namespace,
        response.attributes,
        originalAttributes
      );
    }

    return response;
  }

  /**
   * Strips encrypted attributes from any bulk Saved Objects API response. If type for any bulk
   * response portion isn't registered, it is returned as is.
   * @param response Raw response returned by the underlying base client.
   */
  private async stripEncryptedAttributesFromBulkResponse<
    R extends SavedObjectsBulkResponse | SavedObjectsFindResponse | SavedObjectsBulkUpdateResponse,
    O extends SavedObjectsBulkCreateObject[] | SavedObjectsBulkUpdateObject[]
  >(response: R, namespace: string | undefined, objects?: O): Promise<R> {
    for (const [i, savedObject] of Object.entries(response.saved_objects)) {
      if (this.options.service.isRegistered(savedObject.type)) {
        savedObject.attributes = await this.options.service.handleEncryptedAttributes(
          savedObject.type,
          savedObject.id,
          namespace,
          savedObject.attributes,
          objects ? objects[+i].attributes : undefined
        );
      }
    }

    return response;
  }
}
