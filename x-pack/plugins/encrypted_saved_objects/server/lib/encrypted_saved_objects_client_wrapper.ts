/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  BaseOptions,
  BulkCreateObject,
  BulkGetObjects,
  CreateOptions,
  FindOptions,
  SavedObjectAttributes,
  SavedObjectsClient,
  UpdateOptions,
} from 'src/legacy/server/saved_objects/service/saved_objects_client';
import { EncryptedSavedObjectsService } from './encrypted_saved_objects_service';

interface EncryptedSavedObjectsClientOptions {
  baseClient: SavedObjectsClient;
  service: Readonly<EncryptedSavedObjectsService>;
  dontStripOption: symbol;
}

export class EncryptedSavedObjectsClientWrapper implements SavedObjectsClient {
  constructor(
    private readonly options: EncryptedSavedObjectsClientOptions,
    public readonly errors: SavedObjectsClient['errors'] = options.baseClient.errors
  ) {}

  public async create<T extends SavedObjectAttributes>(
    type: string,
    attributes: T = {} as T,
    options: CreateOptions
  ) {
    await this.options.service.encryptAttributes(type, attributes, options.id);

    const createResult = await this.options.baseClient.create(type, attributes, options);
    this.options.service.stripEncryptedAttributes(createResult.type, createResult.attributes);

    return createResult;
  }

  public async bulkCreate(objects: BulkCreateObject[], options: BaseOptions) {
    // We encrypt attributes for every object sequentially, if it turns out to be very slow,
    // we can consider switching this to `Promise.all` with a fixed max number of operations to be
    // executed in parallel to not exhaust libuv/NodeJS thread pool.
    for (const bulkCreateObject of objects) {
      await this.options.service.encryptAttributes(
        bulkCreateObject.type,
        bulkCreateObject.attributes,
        bulkCreateObject.id
      );
    }

    const bulkCreateResult = await this.options.baseClient.bulkCreate(objects, options);
    for (const bulkCreateObject of bulkCreateResult.saved_objects) {
      this.options.service.stripEncryptedAttributes(
        bulkCreateObject.type,
        bulkCreateObject.attributes
      );
    }

    return bulkCreateResult;
  }

  public async delete(type: string, id: string, options: BaseOptions = {}) {
    return await this.options.baseClient.delete(type, id, options);
  }

  public async find(options: FindOptions = {}) {
    const findResult = await await this.options.baseClient.find(options);

    for (const savedObject of findResult.saved_objects) {
      this.options.service.stripEncryptedAttributes(savedObject.type, savedObject.attributes);
    }

    return findResult;
  }

  public async bulkGet(objects: BulkGetObjects = [], options: BaseOptions) {
    const bulkGetResult = await this.options.baseClient.bulkGet(objects, options);

    for (const savedObject of bulkGetResult.saved_objects) {
      this.options.service.stripEncryptedAttributes(savedObject.type, savedObject.attributes);
    }

    return bulkGetResult;
  }

  public async get(type: string, id: string, options: BaseOptions) {
    const getResult = await this.options.baseClient.get(type, id, options);

    if (!(this.options.dontStripOption in options)) {
      this.options.service.stripEncryptedAttributes(getResult.type, getResult.attributes);
    }

    return getResult;
  }

  public async update<T extends SavedObjectAttributes>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: UpdateOptions
  ) {
    await this.options.service.encryptAttributes(type, attributes, id);

    const updateResult = await this.options.baseClient.update(type, id, attributes, options);
    this.options.service.stripEncryptedAttributes(updateResult.type, updateResult.attributes);

    return updateResult;
  }
}
