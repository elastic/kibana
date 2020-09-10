/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsBaseOptions,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsCheckConflictsObject,
  SavedObjectsClientContract,
  SavedObjectsCreateOptions,
  SavedObjectsFindOptions,
  SavedObjectsUpdateOptions,
  SavedObjectsAddToNamespacesOptions,
  SavedObjectsDeleteFromNamespacesOptions,
  ISavedObjectTypeRegistry,
} from 'src/core/server';
import { SpacesServiceSetup } from '../spaces_service/spaces_service';
import { spaceIdToNamespace } from '../lib/utils/namespace';
import { SpacesClient } from '../lib/spaces_client';

interface SpacesSavedObjectsClientOptions {
  baseClient: SavedObjectsClientContract;
  request: any;
  spacesService: SpacesServiceSetup;
  typeRegistry: ISavedObjectTypeRegistry;
}

const coerceToArray = (param: string | string[]) => {
  if (Array.isArray(param)) {
    return param;
  }

  return [param];
};

const throwErrorIfNamespaceSpecified = (options: any) => {
  if (options.namespace) {
    throw new Error('Spaces currently determines the namespaces');
  }
};

export class SpacesSavedObjectsClient implements SavedObjectsClientContract {
  private readonly client: SavedObjectsClientContract;
  private readonly spaceId: string;
  private readonly types: string[];
  private readonly getSpacesClient: Promise<SpacesClient>;
  public readonly errors: SavedObjectsClientContract['errors'];

  constructor(options: SpacesSavedObjectsClientOptions) {
    const { baseClient, request, spacesService, typeRegistry } = options;

    this.client = baseClient;
    this.getSpacesClient = spacesService.scopedClient(request);
    this.spaceId = spacesService.getSpaceId(request);
    this.types = typeRegistry.getAllTypes().map((t) => t.name);
    this.errors = baseClient.errors;
  }

  /**
   * Check what conflicts will result when creating a given array of saved objects. This includes "unresolvable conflicts", which are
   * multi-namespace objects that exist in a different namespace; such conflicts cannot be resolved/overwritten.
   *
   * @param objects
   * @param options
   */
  public async checkConflicts(
    objects: SavedObjectsCheckConflictsObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    throwErrorIfNamespaceSpecified(options);

    return await this.client.checkConflicts(objects, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
    });
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
  public async create<T = unknown>(
    type: string,
    attributes: T = {} as T,
    options: SavedObjectsCreateOptions = {}
  ) {
    throwErrorIfNamespaceSpecified(options);

    return await this.client.create<T>(type, attributes, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
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
  public async bulkCreate<T = unknown>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options: SavedObjectsBaseOptions = {}
  ) {
    throwErrorIfNamespaceSpecified(options);

    return await this.client.bulkCreate(objects, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
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
    throwErrorIfNamespaceSpecified(options);

    return await this.client.delete(type, id, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
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
   * @property {string} [options.namespaces]
   * @property {object} [options.hasReference] - { type, id }
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }], total, per_page, page }
   */
  public async find<T = unknown>(options: SavedObjectsFindOptions) {
    throwErrorIfNamespaceSpecified(options);

    let namespaces = options.namespaces;
    if (namespaces) {
      const spacesClient = await this.getSpacesClient;
      const availableSpaces = await spacesClient.getAll('findSavedObjects');
      if (namespaces.includes('*')) {
        namespaces = availableSpaces.map((space) => space.id);
      } else {
        namespaces = namespaces.filter((namespace) =>
          availableSpaces.some((space) => space.id === namespace)
        );
      }
      // This forbidden error allows this scenario to be consistent
      // with the way the SpacesClient behaves when no spaces are authorized
      // there.
      if (namespaces.length === 0) {
        throw this.errors.decorateForbiddenError(new Error());
      }
    } else {
      namespaces = [this.spaceId];
    }

    return await this.client.find<T>({
      ...options,
      type: (options.type ? coerceToArray(options.type) : this.types).filter(
        (type) => type !== 'space'
      ),
      namespaces,
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
  public async bulkGet<T = unknown>(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    throwErrorIfNamespaceSpecified(options);

    return await this.client.bulkGet<T>(objects, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
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
  public async get<T = unknown>(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    throwErrorIfNamespaceSpecified(options);

    return await this.client.get<T>(type, id, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
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
  public async update<T = unknown>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions = {}
  ) {
    throwErrorIfNamespaceSpecified(options);

    return await this.client.update(type, id, attributes, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
    });
  }

  /**
   * Adds namespaces to a SavedObject
   *
   * @param type
   * @param id
   * @param namespaces
   * @param options
   */
  public async addToNamespaces(
    type: string,
    id: string,
    namespaces: string[],
    options: SavedObjectsAddToNamespacesOptions = {}
  ) {
    throwErrorIfNamespaceSpecified(options);

    return await this.client.addToNamespaces(type, id, namespaces, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
    });
  }

  /**
   * Removes namespaces from a SavedObject
   *
   * @param type
   * @param id
   * @param namespaces
   * @param options
   */
  public async deleteFromNamespaces(
    type: string,
    id: string,
    namespaces: string[],
    options: SavedObjectsDeleteFromNamespacesOptions = {}
  ) {
    throwErrorIfNamespaceSpecified(options);

    return await this.client.deleteFromNamespaces(type, id, namespaces, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
    });
  }

  /**
   * Updates an array of objects by id
   *
   * @param {array} objects - an array ids, or an array of objects containing id, type, attributes and optionally version, references and namespace
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }] }
   * @example
   *
   * bulkUpdate([
   *   { id: 'one', type: 'config', attributes: { title: 'My new title'}, version: 'd7rhfk47d=' },
   *   { id: 'foo', type: 'index-pattern', attributes: {} }
   * ])
   */
  public async bulkUpdate<T = unknown>(
    objects: Array<SavedObjectsBulkUpdateObject<T>> = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    throwErrorIfNamespaceSpecified(options);
    return await this.client.bulkUpdate(objects, {
      ...options,
      namespace: spaceIdToNamespace(this.spaceId),
    });
  }
}
