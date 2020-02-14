/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import {
  SavedObject,
  SavedObjectAttributes,
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
} from 'src/core/server';
import { EncryptedSavedObjectsService } from '../crypto';

interface EncryptedSavedObjectsClientOptions {
  baseClient: SavedObjectsClientContract;
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

  public async create<T extends SavedObjectAttributes>(
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
    return await this.handleEncryptedAttributesInResponse(
      await this.options.baseClient.create(
        type,
        await this.options.service.encryptAttributes(
          { type, id, namespace: options.namespace },
          attributes
        ),
        { ...options, id }
      ),
      options.namespace,
      attributes
    );
  }

  public async bulkCreate(
    objects: SavedObjectsBulkCreateObject[],
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
        return {
          ...object,
          id,
          attributes: await this.options.service.encryptAttributes(
            { type: object.type, id, namespace: options && options.namespace },
            object.attributes
          ),
        };
      })
    );

    return await this.stripEncryptedAttributesFromBulkResponse(
      await this.options.baseClient.bulkCreate(encryptedObjects, options),
      options?.namespace,
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
        return {
          ...object,
          attributes: await this.options.service.encryptAttributes(
            { type, id, namespace: options && options.namespace },
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

  public async find(options: SavedObjectsFindOptions) {
    return await this.stripEncryptedAttributesFromBulkResponse(
      await this.options.baseClient.find(options),
      options.namespace
    );
  }

  public async bulkGet(
    objects: SavedObjectsBulkGetObject[] = [],
    options?: SavedObjectsBaseOptions
  ) {
    return await this.stripEncryptedAttributesFromBulkResponse(
      await this.options.baseClient.bulkGet(objects, options),
      options?.namespace
    );
  }

  public async get(type: string, id: string, options?: SavedObjectsBaseOptions) {
    return await this.handleEncryptedAttributesInResponse(
      await this.options.baseClient.get(type, id, options),
      options?.namespace
    );
  }

  public async update<T extends SavedObjectAttributes>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options?: SavedObjectsUpdateOptions
  ) {
    if (!this.options.service.isRegistered(type)) {
      return await this.options.baseClient.update(type, id, attributes, options);
    }

    return this.handleEncryptedAttributesInResponse(
      await this.options.baseClient.update(
        type,
        id,
        await this.options.service.encryptAttributes(
          { type, id, namespace: options && options.namespace },
          attributes
        ),
        options
      ),
      options?.namespace,
      attributes
    );
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
    if (this.options.service.isRegistered(response.type)) {
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
