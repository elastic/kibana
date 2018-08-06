/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { isTypeSpaceAware } from './lib/is_type_space_aware';
import { getSpacesQueryFilters } from './lib/query_filters';
import uniq from 'lodash';
import uuid from 'uuid';

export class SpacesSavedObjectsClient {
  constructor(options) {
    const {
      request,
      baseClient,
      spacesService,
      types,
    } = options;

    this.errors = baseClient.errors;

    this._client = baseClient;
    this._types = types;

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
   * @property {object} [options.extraDocumentProperties={}] - extra properties to append to the document body, outside of the object's type property
   * @returns {promise} - { id, type, version, attributes }
  */
  async create(type, attributes = {}, options = {}) {

    const spaceId = this._spaceId;

    const createOptions = {
      ...options,
      extraDocumentProperties: {
        ...options.extraDocumentProperties
      },
      id: this._prependSpaceId(type, options.id)
    };

    if (this._shouldAssignSpaceId(type, spaceId)) {
      createOptions.extraDocumentProperties.spaceId = spaceId;
    } else {
      delete createOptions.extraDocumentProperties.spaceId;
    }

    const result = await this._client.create(type, attributes, createOptions);
    return this._trimSpaceId(result);
  }

  /**
   * Creates multiple documents at once
   *
   * @param {array} objects - [{ type, id, attributes, extraDocumentProperties }]
   * @param {object} [options={}]
   * @property {boolean} [options.overwrite=false] - overwrites existing documents
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes, error: { message } }]}
   */
  async bulkCreate(objects, options = {}) {
    const spaceId = this._spaceId;
    const objectsToCreate = objects.map(object => {

      const objectToCreate = {
        ...object,
        extraDocumentProperties: {
          ...object.extraDocumentProperties
        },
        id: this._prependSpaceId(object.type, object.id)
      };

      if (this._shouldAssignSpaceId(object.type, spaceId)) {
        objectToCreate.extraDocumentProperties.spaceId = spaceId;
      } else {
        delete objectToCreate.extraDocumentProperties.spaceId;
      }

      return objectToCreate;
    });

    const result = await this._client.bulkCreate(objectsToCreate, options);
    result.saved_objects.forEach(this._trimSpaceId.bind(this));

    return result;
  }

  /**
   * Deletes an object
   *
   * @param {string} type
   * @param {string} id
   * @returns {promise}
   */
  async delete(type, id) {
    const objectId = this._prependSpaceId(type, id);

    // attempt to retrieve document before deleting.
    // this ensures that the document belongs to the current space.
    await this.get(type, id);

    return await this._client.delete(type, objectId);
  }

  /**
   * @param {object} [options={}]
   * @property {(string|Array<string>)} [options.type]
   * @property {string} [options.search]
   * @property {Array<string>} [options.searchFields] - see Elasticsearch Simple Query String
   *                                        Query field argument for more information
   * @property {object} [options.filters] - ES Query filters to append
   * @property {integer} [options.page=1]
   * @property {integer} [options.perPage=20]
   * @property {string} [options.sortField]
   * @property {string} [options.sortOrder]
   * @property {Array<string>} [options.fields]
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }], total, per_page, page }
   */
  async find(options = {}) {
    const spaceOptions = {};

    let types = options.type || this._types;
    if (!Array.isArray(types)) {
      types = [types];
    }
    types = types.filter(type => type !== 'space');

    const filters = options.filters || [];

    const spaceId = this._spaceId;

    spaceOptions.filters = [...filters, ...getSpacesQueryFilters(spaceId, types)];

    const result = await this._client.find({ ...options, ...spaceOptions });
    result.saved_objects.forEach(this._trimSpaceId.bind(this));
    return result;
  }

  /**
   * Returns an array of objects by id
   *
   * @param {array} objects - an array ids, or an array of objects containing id and optionally type
   * @param {object} [options = {}]
   * @param {array} [options.extraSourceProperties = []] - an array of extra properties to return from the underlying document
   * @returns {promise} - { saved_objects: [{ id, type, version, attributes }] }
   * @example
   *
   * bulkGet([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  async bulkGet(objects = [], options = {}) {
    // ES 'mget' does not support queries, so we have to filter results after the fact.
    const thisSpaceId = this._spaceId;

    const extraDocumentProperties = this._collectExtraDocumentProperties(['spaceId', 'type'], options.extraDocumentProperties);

    const objectsToRetrieve = objects.map(object => ({
      ...object,
      id: this._prependSpaceId(object.type, object.id)
    }));

    const result = await this._client.bulkGet(objectsToRetrieve, {
      ...options,
      extraDocumentProperties
    });

    result.saved_objects = result.saved_objects.map(savedObject => {
      const { id, type, spaceId = DEFAULT_SPACE_ID } = this._trimSpaceId(savedObject);

      if (isTypeSpaceAware(type)) {
        if (spaceId !== thisSpaceId) {
          return {
            id,
            type,
            error: { statusCode: 404, message: 'Not found' }
          };
        }
      }

      return savedObject;
    });

    return result;
  }

  /**
   * Gets a single object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} [options = {}]
   * @param {array} [options.extraSourceProperties = []] - an array of extra properties to return from the underlying document
   * @returns {promise} - { id, type, version, attributes }
   */
  async get(type, id, options = {}) {
    // ES 'get' does not support queries, so we have to filter results after the fact.

    const objectId = this._prependSpaceId(type, id);

    const extraDocumentProperties = this._collectExtraDocumentProperties(['spaceId'], options.extraDocumentProperties);

    const response = await this._client.get(type, objectId, {
      ...options,
      extraDocumentProperties
    });

    const { spaceId: objectSpaceId = DEFAULT_SPACE_ID } = response;

    if (isTypeSpaceAware(type)) {
      const thisSpaceId = this._spaceId;
      if (objectSpaceId !== thisSpaceId) {
        throw this._client.errors.createGenericNotFoundError();
      }
    }

    return this._trimSpaceId(response);
  }

  /**
   * Updates an object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} [options={}]
   * @property {integer} options.version - ensures version matches that of persisted object
   * @param {array} [options.extraDocumentProperties = {}] - an object of extra properties to write into the underlying document
   * @returns {promise}
   */
  async update(type, id, attributes, options = {}) {
    const updateOptions = {
      ...options,
      extraDocumentProperties: {
        ...options.extraDocumentProperties
      }
    };

    const objectId = this._prependSpaceId(type, id);

    // attempt to retrieve document before updating.
    // this ensures that the document belongs to the current space.
    if (isTypeSpaceAware(type)) {
      await this.get(type, id);

      const spaceId = this._spaceId;

      if (this._shouldAssignSpaceId(type, spaceId)) {
        updateOptions.extraDocumentProperties.spaceId = spaceId;
      } else {
        delete updateOptions.extraDocumentProperties.spaceId;
      }
    }

    const result = await this._client.update(type, objectId, attributes, updateOptions);
    return this._trimSpaceId(result);
  }

  _collectExtraDocumentProperties(thisClientProperties, optionalProperties = []) {
    return uniq([...thisClientProperties, ...optionalProperties]).value();
  }

  _shouldAssignSpaceId(type, spaceId) {
    return spaceId !== DEFAULT_SPACE_ID && isTypeSpaceAware(type);
  }

  _prependSpaceId(type, id = uuid.v1()) {
    if (this._spaceId === DEFAULT_SPACE_ID || !isTypeSpaceAware(type)) {
      return id;
    }
    return `${this._spaceId}:${id}`;
  }

  _trimSpaceId(savedObject) {
    const prefix = `${this._spaceId}:`;

    const idHasPrefix = savedObject.id.startsWith(prefix);

    if (this._shouldAssignSpaceId(savedObject.type, this._spaceId)) {
      if (idHasPrefix) {
        savedObject.id = savedObject.id.slice(prefix.length);
      } else {
        throw new Error(`Saved object [${savedObject.type}/${savedObject.id}] is missing its expected space identifier.`);
      }
    } else if (idHasPrefix) {
      throw new Error(`Saved object [${savedObject.type}/${savedObject.id}] has an unexpected space identifier [${this._spaceId}].`);
    }

    return savedObject;
  }
}
