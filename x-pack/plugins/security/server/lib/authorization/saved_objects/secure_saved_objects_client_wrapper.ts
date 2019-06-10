/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import {
  SavedObjectsClientContract,
  CreateOptions,
  SavedObjectAttributes,
  BulkCreateObject,
  BaseOptions,
  FindOptions,
  BulkGetObject,
  FindResponse,
  BulkResponse,
  SavedObject,
  UpdateOptions,
} from 'src/legacy/server/saved_objects';
import {
  CheckSavedObjectsPrivileges,
  SavedObjectsOperation,
} from './check_saved_objects_privileges';

export interface SecureSavedObjectsClientWrapperDeps {
  baseClient: SavedObjectsClientContract;
  checkSavedObjectsPrivileges: CheckSavedObjectsPrivileges;
  errors: SavedObjectsClientContract['errors'];
}
export class SecureSavedObjectsClientWrapper implements SavedObjectsClientContract {
  private baseClient: SavedObjectsClientContract;

  private checkSavedObjectsPrivileges: CheckSavedObjectsPrivileges;

  public errors: SavedObjectsClientContract['errors'];

  constructor(options: SecureSavedObjectsClientWrapperDeps) {
    const { baseClient, checkSavedObjectsPrivileges, errors } = options;

    this.errors = errors;
    this.baseClient = baseClient;
    this.checkSavedObjectsPrivileges = checkSavedObjectsPrivileges;
  }

  public async create<T extends SavedObjectAttributes = any>(
    type: string,
    attributes: T,
    options: CreateOptions = {}
  ) {
    await this.ensureAuthorized(type, 'create', options.namespace, { type, attributes, options });

    return await this.baseClient.create(type, attributes, options);
  }

  public async bulkCreate<T extends SavedObjectAttributes = any>(
    objects: Array<BulkCreateObject<T>>,
    options: CreateOptions = {}
  ) {
    const types = uniq(objects.map(o => o.type));
    await this.ensureAuthorized(types, 'bulk_create', options.namespace, { objects, options });

    return await this.baseClient.bulkCreate(objects, options);
  }

  public async delete(type: string, id: string, options: BaseOptions = {}) {
    await this.ensureAuthorized(type, 'delete', options.namespace, { type, id, options });

    return await this.baseClient.delete(type, id, options);
  }

  public async find<T extends SavedObjectAttributes = any>(
    options: FindOptions = {}
  ): Promise<FindResponse<T>> {
    await this.ensureAuthorized(options.type, 'find', options.namespace, { options });

    return this.baseClient.find(options);
  }

  public async bulkGet<T extends SavedObjectAttributes = any>(
    objects: BulkGetObject[] = [],
    options: BaseOptions = {}
  ): Promise<BulkResponse<T>> {
    const types = uniq(objects.map(o => o.type));
    await this.ensureAuthorized(types, 'bulk_get', options.namespace, { objects, options });

    return await this.baseClient.bulkGet(objects, options);
  }

  public async get<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    options: BaseOptions = {}
  ): Promise<SavedObject<T>> {
    await this.ensureAuthorized(type, 'get', options.namespace, { type, id, options });

    return await this.baseClient.get(type, id, options);
  }

  public async update<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: UpdateOptions = {}
  ) {
    await this.ensureAuthorized(type, 'update', options.namespace, {
      type,
      id,
      attributes,
      options,
    });

    return await this.baseClient.update(type, id, attributes, options);
  }

  private async ensureAuthorized(
    typeOrTypes: string | string[] | undefined,
    action: SavedObjectsOperation,
    namespace: string | undefined,
    args: any
  ) {
    await this.checkSavedObjectsPrivileges(typeOrTypes, action, namespace, args);
  }
}
