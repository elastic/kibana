/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  BaseOptions,
  BulkCreateObject,
  BulkGetObject,
  CreateOptions,
  FindOptions,
  SavedObjectAttributes,
  SavedObjectsClient,
  UpdateOptions,
} from 'src/legacy/server/saved_objects/service/saved_objects_client';

export class SavedObjectAttributeCryptoClient implements SavedObjectsClient {
  constructor(
    private readonly baseClient: SavedObjectsClient,
    private readonly request: any,
    private readonly info: (message: string) => void,
    public readonly errors: any = baseClient.errors
  ) {}

  public get(id: string, type: string, options?: BaseOptions) {
    this.info(`Get is called with ${type} and ${id}`);
    return this.baseClient.get(id, type, options);
  }

  public bulkGet(objects: BulkGetObject[], options?: BaseOptions) {
    this.info(
      `bulkGet is called with types ${objects.map(o => o.type).join(',')} and ${objects
        .map(o => o.id)
        .join(',')}`
    );
    return this.baseClient.bulkGet(objects, options);
  }

  public find(options: FindOptions) {
    this.info(`find is called with ${JSON.stringify(options)}`);
    return this.baseClient.find(options);
  }

  public create<T extends SavedObjectAttributes>(
    type: string,
    attributes: T,
    options?: CreateOptions
  ) {
    this.info(`create is called with ${type} and ${JSON.stringify(attributes)}`);
    return this.baseClient.create<T>(type, attributes, options);
  }

  public bulkCreate<T extends SavedObjectAttributes>(
    objects: Array<BulkCreateObject<T>>,
    options?: CreateOptions
  ) {
    this.info(
      `bulkCreate is called with ${objects.map(o => o.type).join(',')} and ${objects
        .map(o => o.id)
        .join(',')}`
    );
    return this.baseClient.bulkCreate(objects, options);
  }

  public update<T extends SavedObjectAttributes>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options?: UpdateOptions
  ) {
    this.info(`update is called with ${type} and ${id} and ${JSON.stringify(attributes)}`);
    return this.baseClient.update(type, id, attributes, options);
  }

  public delete(type: string, id: string, options?: BaseOptions) {
    return this.baseClient.delete(type, id, options);
  }
}
