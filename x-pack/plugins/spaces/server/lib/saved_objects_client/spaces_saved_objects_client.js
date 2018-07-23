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

    this._spaceUrlContext = spacesService.getUrlContext(request);
  }

  async create(type, attributes = {}, options = {}) {

    const spaceId = await this._getSpaceId();

    const createOptions = {
      ...options
    };

    if (this._shouldAssignSpaceId(type, spaceId)) {
      createOptions.id = this._generateDocumentId(spaceId, options.id);
      createOptions.extraDocumentProperties = {
        ...options.extraDocumentProperties,
        spaceId
      };
    }

    const result = await this._client.create(type, attributes, createOptions);
    return this._trimSpaceId(spaceId, result);
  }

  async bulkCreate(objects, options = {}) {
    const spaceId = await this._getSpaceId();
    const objectsToCreate = objects.map(object => {
      if (this._shouldAssignSpaceId(object.type, spaceId)) {
        return {
          ...object,
          id: this._generateDocumentId(spaceId, object.id),
          extraDocumentProperties: {
            ...object.extraDocumentProperties,
            spaceId
          }
        };
      }
      return object;
    });

    const result = await this._client.bulkCreate(objectsToCreate, options);
    return result.map(object => this._trimSpaceId(spaceId, object));
  }

  async delete(type, id) {
    // attempt to retrieve document before deleting.
    // this ensures that the document belongs to the current space.
    await this.get(type, id);

    let documentId = id;

    if (this._shouldAssignSpaceId(type, id)) {
      const spaceId = await this._getSpaceId();
      documentId = this._generateDocumentId(spaceId, id);
    }

    return await this._client.delete(type, documentId);
  }

  async find(options = {}) {
    const spaceOptions = {};

    let types = options.type || this._types;
    if (!Array.isArray(types)) {
      types = [types];
    }

    const filters = options.filters || [];

    const spaceId = await this._getSpaceId();

    spaceOptions.filters = [...filters, ...getSpacesQueryFilters(spaceId, types)];

    const result = await this._client.find({ ...options, ...spaceOptions });
    result.saved_objects.map(object => this._trimSpaceId(spaceId, object));

    return result;
  }

  async bulkGet(objects = [], options = {}) {
    // ES 'mget' does not support queries, so we have to filter results after the fact.
    const thisSpaceId = await this._getSpaceId();

    const objectsToQuery = objects.map(object => ({
      ...object,
      id: this._generateDocumentId(thisSpaceId, object.id)
    }));

    const extraDocumentProperties = this._collectExtraDocumentProperties(['spaceId', 'type'], options.extraDocumentProperties);

    const result = await this._client.bulkGet(objectsToQuery, {
      extraDocumentProperties
    });

    result.saved_objects = result.saved_objects.map(savedObject => {
      const { id, type, spaceId = DEFAULT_SPACE_ID } = savedObject;

      if (isTypeSpaceAware(type)) {
        if (spaceId !== thisSpaceId) {
          return this._trimSpaceId(thisSpaceId, {
            id,
            type,
            error: { statusCode: 404, message: 'Not found' }
          });
        }
      }

      return this._trimSpaceId(thisSpaceId, savedObject);
    });

    return result;
  }

  async get(type, id, options = {}) {
    // ES 'get' does not support queries, so we have to filter results after the fact.

    let documentId = id;

    const spaceId = await this._getSpaceId();
    if (isTypeSpaceAware(type)) {
      documentId = this._generateDocumentId(spaceId, id);
    }

    const extraDocumentProperties = this._collectExtraDocumentProperties(['spaceId'], options.extraDocumentProperties);

    const response = await this._client.get(type, documentId, {
      extraDocumentProperties
    });

    const { spaceId: objectSpaceId = DEFAULT_SPACE_ID } = response;

    if (isTypeSpaceAware(type)) {
      const thisSpaceId = await this._getSpaceId();
      if (objectSpaceId !== thisSpaceId) {
        throw this._client.errors.createGenericNotFoundError();
      }
    }

    return this._trimSpaceId(spaceId, response);
  }

  async update(type, id, attributes, options = {}) {
    // attempt to retrieve document before updating.
    // this ensures that the document belongs to the current space.
    let documentId = id;
    const spaceId = await this._getSpaceId();

    const updateOptions = {
      ...options
    };

    if (isTypeSpaceAware(type)) {
      await this.get(type, id);

      documentId = this._generateDocumentId(spaceId, id);

      if (this._shouldAssignSpaceId(type, spaceId)) {
        updateOptions.extraDocumentProperties = {
          ...options.extraDocumentProperties,
          spaceId
        };
      }
    }

    const result = await this._client.update(type, documentId, attributes, updateOptions);
    return this._trimSpaceId(spaceId, result);
  }

  async _getSpaceId() {
    if (!this._spaceUrlContext) {
      return DEFAULT_SPACE_ID;
    }

    if (!this._spaceId) {
      this._spaceId = await this._findSpace(this._spaceUrlContext);
    }

    return this._spaceId;
  }

  async _findSpace(urlContext) {
    const {
      saved_objects: spaces = []
    } = await this._client.find({
      type: 'space',
      search: `${urlContext}`,
      search_fields: ['urlContext']
    });

    if (spaces.length > 0) {
      return spaces[0].id;
    }

    return null;
  }

  _shouldAssignSpaceId(type, spaceId) {
    return isTypeSpaceAware(type) && spaceId !== DEFAULT_SPACE_ID;
  }

  _generateDocumentId(spaceId, id = uuid.v1()) {
    if (!spaceId || spaceId === DEFAULT_SPACE_ID) {
      return id;
    }
    return `${spaceId}:${id}`;
  }

  _trimSpaceId(spaceId, savedObject) {
    const prefix = `${spaceId}:`;

    if (savedObject.id.startsWith(prefix)) {
      savedObject.id = savedObject.id.slice(prefix.length);
    }

    return savedObject;
  }

  _collectExtraDocumentProperties(thisClientProperties, optionalProperties = []) {
    return uniq([...thisClientProperties, ...optionalProperties]).value();
  }
}
