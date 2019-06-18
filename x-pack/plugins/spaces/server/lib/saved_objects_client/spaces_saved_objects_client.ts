/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectAttributes,
  SavedObjectsBaseOptions,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsClientContract,
  SavedObjectsCreateOptions,
  SavedObjectsFindOptions,
  SavedObjectsUpdateOptions,
  SavedObjectsNamespace,
} from 'src/core/server';
import { SpacesService } from '../create_spaces_service';

interface SpacesSavedObjectsClientOptions {
  baseClient: SavedObjectsClientContract;
  request: any;
  spacesService: SpacesService;
  getNamespace: (
    options: SavedObjectsBaseOptions,
    currentSpaceId: string
  ) => SavedObjectsNamespace | undefined;
  types: string[];
}

const coerceToArray = (param: string | string[]) => {
  if (Array.isArray(param)) {
    return param;
  }

  return [param];
};

const throwErrorIfTypeIsSpace = (type: string) => {
  if (type === 'space') {
    throw new Error('Spaces can not be accessed using the SavedObjectsClient');
  }
};

const throwErrorIfTypesContainsSpace = (types: string[]) => {
  for (const type of types) {
    throwErrorIfTypeIsSpace(type);
  }
};

export class SpacesSavedObjectsClient implements SavedObjectsClientContract {
  private readonly client: SavedObjectsClientContract;
  private readonly spaceId: string;
  private readonly types: string[];
  private readonly getNamespace: (
    options: SavedObjectsBaseOptions,
    currentSpaceId: string
  ) => SavedObjectsNamespace | undefined;

  public readonly errors: SavedObjectsClientContract['errors'];

  constructor(options: SpacesSavedObjectsClientOptions) {
    const { baseClient, request, spacesService, types, getNamespace } = options;

    this.client = baseClient;
    this.spaceId = spacesService.getSpaceId(request);
    this.types = types;
    this.getNamespace = getNamespace;
    this.errors = baseClient.errors;
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
  public async create<T extends SavedObjectAttributes>(
    type: string,
    attributes: T = {} as T,
    options: SavedObjectsCreateOptions = {}
  ) {
    throwErrorIfTypeIsSpace(type);

    return await this.client.create(type, attributes, {
      ...options,
      namespace: this.getNamespace(options, this.spaceId),
    });
  }

  /**
   * Creates multiple documents at once
   *
   * @param {array} objects - [{ type, id, attributes }]
   * @param {object} [options={}]
   * @property {boolean} [options.overwrite=false] - overwrites existing documents
   * @property {string} [options.namespace]
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes, error: { message } }]}
   */
  public async bulkCreate(
    objects: SavedObjectsBulkCreateObject[],
    options: SavedObjectsBaseOptions = {}
  ) {
    throwErrorIfTypesContainsSpace(objects.map(object => object.type));

    return await this.client.bulkCreate(objects, {
      ...options,
      namespace: this.getNamespace(options, this.spaceId),
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
  public async delete(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    throwErrorIfTypeIsSpace(type);

    return await this.client.delete(type, id, {
      ...options,
      namespace: this.getNamespace(options, this.spaceId),
    });
  }

  /**
   * @param {object} [options={}]
   * @property {(string|Array<string>)} [options.type]
   * @property {string} [options.search]
   * @property {string} [options.defaultSearchOperator]
   * @property {Array<string>} [options.searchFields] - see Elasticsearch Simple Query String
   *                                        Query field argument for more information
   * @property {integer} [options.page=1]
   * @property {integer} [options.perPage=20]
   * @property {string} [options.sortField]
   * @property {string} [options.sortOrder]
   * @property {Array<string>} [options.fields]
   * @property {string} [options.namespace]
   * @property {object} [options.hasReference] - { type, id }
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }], total, per_page, page }
   */
  public async find(options: SavedObjectsFindOptions = {}) {
    if (options.type) {
      throwErrorIfTypesContainsSpace(coerceToArray(options.type));
    }

    return await this.client.find({
      ...options,
      type: (options.type ? coerceToArray(options.type) : this.types).filter(
        type => type !== 'space'
      ),
      namespace: this.getNamespace(options, this.spaceId),
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
  public async bulkGet(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    throwErrorIfTypesContainsSpace(objects.map(object => object.type));

    return await this.client.bulkGet(objects, {
      ...options,
      namespace: this.getNamespace(options, this.spaceId),
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
  public async get(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    throwErrorIfTypeIsSpace(type);

    return await this.client.get(type, id, {
      ...options,
      namespace: this.getNamespace(options, this.spaceId),
    });
  }

  /**
   * Updates an object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} [options={}]
   * @property {string} options.version - ensures version matches that of persisted object
   * @property {string} [options.namespace]
   * @returns {promise}
   */
  public async update<T extends SavedObjectAttributes>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions = {}
  ) {
    throwErrorIfTypeIsSpace(type);

    return await this.client.update(type, id, attributes, {
      ...options,
      namespace: this.getNamespace(options, this.spaceId),
    });
  }
}
