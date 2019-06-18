/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import {
  SavedObjectsClientContract,
  SavedObjectsCreateOptions,
  SavedObjectAttributes,
  SavedObjectsBulkCreateObject,
  SavedObjectsBaseOptions,
  SavedObjectsFindOptions,
  SavedObjectsBulkGetObject,
  SavedObjectsFindResponse,
  SavedObjectsBulkResponse,
  SavedObject,
  SavedObjectsUpdateOptions,
} from 'src/core/server';
import { EnsureSavedObjectsPrivileges } from './ensure_saved_objects_privileges';

export interface SecureSavedObjectsClientWrapperDeps {
  baseClient: SavedObjectsClientContract;
  ensureSavedObjectsPrivileges: EnsureSavedObjectsPrivileges;
  errors: SavedObjectsClientContract['errors'];
}
export class SecureSavedObjectsClientWrapper implements SavedObjectsClientContract {
  private baseClient: SavedObjectsClientContract;

  private ensureSavedObjectsPrivileges: EnsureSavedObjectsPrivileges;

  public errors: SavedObjectsClientContract['errors'];

  constructor(options: SecureSavedObjectsClientWrapperDeps) {
    const { baseClient, ensureSavedObjectsPrivileges, errors } = options;

    this.errors = errors;
    this.baseClient = baseClient;
    this.ensureSavedObjectsPrivileges = ensureSavedObjectsPrivileges;
  }

  public async create<T extends SavedObjectAttributes = any>(
    type: string,
    attributes: T,
    options: SavedObjectsCreateOptions = {}
  ) {
    await this.ensureSavedObjectsPrivileges(type, 'create', options.namespace, {
      type,
      attributes,
      options,
    });

    return await this.baseClient.create(type, attributes, options);
  }

  public async bulkCreate<T extends SavedObjectAttributes = any>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options: SavedObjectsCreateOptions = {}
  ) {
    const types = uniq(objects.map(o => o.type));
    await this.ensureSavedObjectsPrivileges(types, 'bulk_create', options.namespace, {
      objects,
      options,
    });

    return await this.baseClient.bulkCreate(objects, options);
  }

  public async delete(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    await this.ensureSavedObjectsPrivileges(type, 'delete', options.namespace, {
      type,
      id,
      options,
    });

    return await this.baseClient.delete(type, id, options);
  }

  public async find<T extends SavedObjectAttributes = any>(
    options: SavedObjectsFindOptions = {}
  ): Promise<SavedObjectsFindResponse<T>> {
    await this.ensureSavedObjectsPrivileges(options.type, 'find', options.namespace, { options });

    return this.baseClient.find(options);
  }

  public async bulkGet<T extends SavedObjectAttributes = any>(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObjectsBulkResponse<T>> {
    const types = uniq(objects.map(o => o.type));
    await this.ensureSavedObjectsPrivileges(types, 'bulk_get', options.namespace, {
      objects,
      options,
    });

    return await this.baseClient.bulkGet(objects, options);
  }

  public async get<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObject<T>> {
    await this.ensureSavedObjectsPrivileges(type, 'get', options.namespace, { type, id, options });

    return await this.baseClient.get(type, id, options);
  }

  public async update<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions = {}
  ) {
    await this.ensureSavedObjectsPrivileges(type, 'update', options.namespace, {
      type,
      id,
      attributes,
      options,
    });

    return await this.baseClient.update(type, id, attributes, options);
  }
}
