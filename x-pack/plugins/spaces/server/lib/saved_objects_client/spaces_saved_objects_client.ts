/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { SpacesService } from '../create_spaces_service';
import {
  BaseOptions,
  BulkCreateObject,
  BulkGetObjects,
  CreateOptions,
  FindOptions,
  SavedObjectAttributes,
  SavedObjectsClient,
  UpdateOptions,
} from './saved_objects_client_types';

interface SpacesSavedObjectsClientOptions {
  baseClient: SavedObjectsClient;
  request: any;
  spacesService: SpacesService;
}

export class SpacesSavedObjectsClient implements SavedObjectsClient {
  public errors: any;

  private client: any;
  private spaceId: string;

  constructor(options: SpacesSavedObjectsClientOptions) {
    const { baseClient, request, spacesService } = options;

    this.errors = baseClient.errors;
    this.client = baseClient;
    this.spaceId = spacesService.getSpaceId(request);
  }

  /**
   * Persists an object
   *
   * @param {string} type
   * @param {object} attributes
   * @param {object} [options={}]
   * @property {string} [options.id] - force id on creation, not recommended
   * @property {boolean} [options.overwrite=false]
   * @property {string} [options.namespace]
   * @returns {promise} - { id, type, version, attributes }
   */
  public async create(type: string, attributes = {}, options: CreateOptions = {}) {
    if (options.namespace) {
      throw new Error('Spaces currently determines the namespaces');
    }

    return await this.client.create(type, attributes, {
      ...options,
      namespace: this._getNamespace(this.spaceId),
    });
  }

  /**
   * Creates multiple documents at once
   *
   * @param {array} objects - [{ type, id, attributes, extraDocumentProperties }]
   * @param {object} [options={}]
   * @property {boolean} [options.overwrite=false] - overwrites existing documents
   * @property {string} [options.namespace]
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes, error: { message } }]}
   */
  public async bulkCreate(objects: BulkCreateObject[], options: CreateOptions = {}) {
    if (options.namespace) {
      throw new Error('Spaces currently determines the namespaces');
    }

    return await this.client.bulkCreate(objects, {
      ...options,
      namespace: this._getNamespace(this.spaceId),
    });
  }

  /**
   * Deletes an object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} [options={}]
   * @property {string} [options.namespace]
   * @returns {promise}
   */
  public async delete(type: string, id: string, options: BaseOptions = {}) {
    if (options.namespace) {
      throw new Error('Spaces currently determines the namespaces');
    }

    return await this.client.delete(type, id, {
      ...options,
      namespace: this._getNamespace(this.spaceId),
    });
  }

  /**
   * @param {object} [options={}]
   * @property {(string|Array<string>)} [options.type]
   * @property {string} [options.search]
   * @property {Array<string>} [options.searchFields] - see Elasticsearch Simple Query String
   *                                        Query field argument for more information
   * @property {integer} [options.page=1]
   * @property {integer} [options.perPage=20]
   * @property {string} [options.sortField]
   * @property {string} [options.sortOrder]
   * @property {Array<string>} [options.fields]
   * @property {string} [options.namespace]
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }], total, per_page, page }
   */
  public async find(options: FindOptions = {}) {
    if (options.namespace) {
      throw new Error('Spaces currently determines the namespaces');
    }

    return await this.client.find({
      ...options,
      namespace: this._getNamespace(this.spaceId),
    });
  }

  /**
   * Returns an array of objects by id
   *
   * @param {array} objects - an array ids, or an array of objects containing id and optionally type
   * @param {object} [options={}]
   * @property {string} [options.namespace]
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }] }
   * @example
   *
   * bulkGet([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  public async bulkGet(objects: BulkGetObjects = [], options: BaseOptions = {}) {
    if (options.namespace) {
      throw new Error('Spaces currently determines the namespaces');
    }

    return await this.client.bulkGet(objects, {
      ...options,
      namespace: this._getNamespace(this.spaceId),
    });
  }

  /**
   * Gets a single object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} [options={}]
   * @property {string} [options.namespace]
   * @returns {promise} - { id, type, version, attributes }
   */
  public async get(type: string, id: string, options: BaseOptions = {}) {
    if (options.namespace) {
      throw new Error('Spaces currently determines the namespaces');
    }

    return await this.client.get(type, id, {
      ...options,
      namespace: this._getNamespace(this.spaceId),
    });
  }

  /**
   * Updates an object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} [options={}]
   * @property {integer} options.version - ensures version matches that of persisted object
   * @property {string} [options.namespace]
   * @returns {promise}
   */
  public async update(
    type: string,
    id: string,
    attributes: SavedObjectAttributes,
    options: UpdateOptions = {}
  ) {
    if (options.namespace) {
      throw new Error('Spaces currently determines the namespaces');
    }

    return await this.client.update(type, id, attributes, {
      ...options,
      namespace: this._getNamespace(this.spaceId),
    });
  }

  public _getNamespace(spaceId: string) {
    if (spaceId === DEFAULT_SPACE_ID) {
      return undefined;
    }

    return spaceId;
  }
}
