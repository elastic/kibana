/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_SPACE_ID } from '../../../common/constants';

export class SpacesSavedObjectsClient {
  constructor(options) {
    const {
      baseClient,
      request,
      spacesService,
    } = options;

    this.errors = baseClient.errors;
    this._client = baseClient;
    this._spaceId = spacesService.getSpaceId(request);
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
  async create(type, attributes = {}, options = {}) {
    if (options.namespace) {
      throw new Error('Spaces currently determines the namespaces');
    }

    return await this._client.create(type, attributes, {
      ...options,
      namespace: this._getNamespace(this._spaceId)
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
  async bulkCreate(objects, options = {}) {
    if (options.namespace) {
      throw new Error('Spaces currently determines the namespaces');
    }

    return await this._client.bulkCreate(objects, {
      ...options,
      namespace: this._getNamespace(this._spaceId)
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
  async delete(type, id, options = {}) {
    if (options.namespace) {
      throw new Error('Spaces currently determines the namespaces');
    }

    return await this._client.delete(type, id, {
      ...options,
      namespace: this._getNamespace(this._spaceId)
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
  async find(options = {}) {
    if (options.namespace) {
      throw new Error('Spaces currently determines the namespaces');
    }

    return await this._client.find({
      ...options,
      namespace: this._getNamespace(this._spaceId)
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
  async bulkGet(objects = [], options = {}) {
    if (options.namespace) {
      throw new Error('Spaces currently determines the namespaces');
    }

    return await this._client.bulkGet(objects, {
      ...options,
      namespace: this._getNamespace(this._spaceId)
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
  async get(type, id, options = {}) {
    if (options.namespace) {
      throw new Error('Spaces currently determines the namespaces');
    }

    return await this._client.get(type, id, {
      ...options,
      namespace: this._getNamespace(this._spaceId)
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
  async update(type, id, attributes, options = {}) {
    if (options.namespace) {
      throw new Error('Spaces currently determines the namespaces');
    }

    return await this._client.update(type, id, attributes, {
      ...options,
      namespace: this._getNamespace(this._spaceId)
    });
  }

  _getNamespace(spaceId) {
    if (spaceId === DEFAULT_SPACE_ID) {
      return undefined;
    }

    return spaceId;
  }
}
