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
  SavedObjectsClientContract,
  UpdateOptions,
} from 'src/legacy/server/saved_objects';
import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { SpacesService } from '../create_spaces_service';

interface SpacesSavedObjectsClientOptions {
  baseClient: SavedObjectsClientContract;
  request: any;
  spacesService: SpacesService;
  types: string[];
}

const coerceToArray = (param: string | string[]) => {
  if (Array.isArray(param)) {
    return param;
  }

  return [param];
};

const getNamespace = (spaceId: string) => {
  if (spaceId === DEFAULT_SPACE_ID) {
    return undefined;
  }

  return spaceId;
};

const throwErrorIfNamespaceSpecified = (options: any) => {
  if (options.namespace) {
    throw new Error('Spaces currently determines the namespaces');
  }
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
  public readonly errors: SavedObjectsClientContract['errors'];

  constructor(options: SpacesSavedObjectsClientOptions) {
    const { baseClient, request, spacesService, types } = options;

    this.client = baseClient;
    this.spaceId = spacesService.getSpaceId(request);
    this.types = types;
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
    options: CreateOptions = {}
  ) {
    throwErrorIfTypeIsSpace(type);
    throwErrorIfNamespaceSpecified(options);

    return await this.client.create(type, attributes, {
      ...options,
      namespace: getNamespace(this.spaceId),
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
  public async bulkCreate(objects: BulkCreateObject[], options: BaseOptions = {}) {
    throwErrorIfTypesContainsSpace(objects.map(object => object.type));
    throwErrorIfNamespaceSpecified(options);

    return await this.client.bulkCreate(objects, {
      ...options,
      namespace: getNamespace(this.spaceId),
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
    throwErrorIfTypeIsSpace(type);
    throwErrorIfNamespaceSpecified(options);

    return await this.client.delete(type, id, {
      ...options,
      namespace: getNamespace(this.spaceId),
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
  public async find(options: FindOptions = {}) {
    if (options.type) {
      throwErrorIfTypesContainsSpace(coerceToArray(options.type));
    }

    throwErrorIfNamespaceSpecified(options);

    return await this.client.find({
      ...options,
      type: (options.type ? coerceToArray(options.type) : this.types).filter(
        type => type !== 'space'
      ),
      namespace: getNamespace(this.spaceId),
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
  public async bulkGet(objects: BulkGetObject[] = [], options: BaseOptions = {}) {
    throwErrorIfTypesContainsSpace(objects.map(object => object.type));
    throwErrorIfNamespaceSpecified(options);

    return await this.client.bulkGet(objects, {
      ...options,
      namespace: getNamespace(this.spaceId),
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
    throwErrorIfTypeIsSpace(type);
    throwErrorIfNamespaceSpecified(options);

    return await this.client.get(type, id, {
      ...options,
      namespace: getNamespace(this.spaceId),
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
    options: UpdateOptions = {}
  ) {
    throwErrorIfTypeIsSpace(type);
    throwErrorIfNamespaceSpecified(options);

    return await this.client.update(type, id, attributes, {
      ...options,
      namespace: getNamespace(this.spaceId),
    });
  }
}
