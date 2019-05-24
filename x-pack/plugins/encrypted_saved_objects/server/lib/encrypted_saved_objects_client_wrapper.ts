/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import {
  BaseOptions,
  BulkCreateObject,
  BulkGetObject,
  BulkResponse,
  CreateOptions,
  FindOptions,
  FindResponse,
  SavedObjectAttributes,
  SavedObjectsClientContract,
  UpdateOptions,
  UpdateResponse,
  SavedObject,
} from 'src/legacy/server/saved_objects';
import { EncryptedSavedObjectsService } from './encrypted_saved_objects_service';

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
    options: CreateOptions = {}
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
    return this.stripEncryptedAttributesFromResponse(
      await this.options.baseClient.create(
        type,
        await this.options.service.encryptAttributes(
          { type, id, namespace: options.namespace },
          attributes
        ),
        { ...options, id }
      )
    );
  }

  public async bulkCreate(objects: BulkCreateObject[], options?: BaseOptions) {
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

    return this.stripEncryptedAttributesFromBulkResponse(
      await this.options.baseClient.bulkCreate(encryptedObjects, options)
    );
  }

  public async delete(type: string, id: string, options?: BaseOptions) {
    return await this.options.baseClient.delete(type, id, options);
  }

  public async find(options: FindOptions = {}) {
    return this.stripEncryptedAttributesFromBulkResponse(
      await this.options.baseClient.find(options)
    );
  }

  public async bulkGet(objects: BulkGetObject[] = [], options?: BaseOptions) {
    return this.stripEncryptedAttributesFromBulkResponse(
      await this.options.baseClient.bulkGet(objects, options)
    );
  }

  public async get(type: string, id: string, options?: BaseOptions) {
    return this.stripEncryptedAttributesFromResponse(
      await this.options.baseClient.get(type, id, options)
    );
  }

  public async update<T extends SavedObjectAttributes>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options?: UpdateOptions
  ) {
    if (!this.options.service.isRegistered(type)) {
      return await this.options.baseClient.update(type, id, attributes, options);
    }

    return this.stripEncryptedAttributesFromResponse(
      await this.options.baseClient.update(
        type,
        id,
        await this.options.service.encryptAttributes(
          { type, id, namespace: options && options.namespace },
          attributes
        ),
        options
      )
    );
  }

  /**
   * Strips encrypted attributes from any non-bulk Saved Objects API response. If type isn't
   * registered, response is returned as is.
   * @param response Raw response returned by the underlying base client.
   */
  private stripEncryptedAttributesFromResponse<T extends UpdateResponse | SavedObject>(
    response: T
  ): T {
    if (this.options.service.isRegistered(response.type)) {
      response.attributes = this.options.service.stripEncryptedAttributes(
        response.type,
        response.attributes
      );
    }

    return response;
  }

  /**
   * Strips encrypted attributes from any bulk Saved Objects API response. If type for any bulk
   * response portion isn't registered, it is returned as is.
   * @param response Raw response returned by the underlying base client.
   */
  private stripEncryptedAttributesFromBulkResponse<T extends BulkResponse | FindResponse>(
    response: T
  ): T {
    for (const savedObject of response.saved_objects) {
      if (this.options.service.isRegistered(savedObject.type)) {
        savedObject.attributes = this.options.service.stripEncryptedAttributes(
          savedObject.type,
          savedObject.attributes
        );
      }
    }

    return response;
  }
}
