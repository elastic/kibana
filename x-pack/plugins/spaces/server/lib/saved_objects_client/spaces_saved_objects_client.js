/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_SPACE_ID } from '../../../common/constants';

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
    this._request = request;
    this._types = types;

    this._spaceUrlContext = spacesService.getUrlContext(this._request, '');
  }

  async create(type, attributes = {}, options = {}) {

    if (this._isTypeSpaceAware(type)) {
      options.extraBodyProperties = {
        ...options.extraBodyProperties,
        spaceId: await this._getSpaceId()
      };
    }

    return await this._client.create(type, attributes, options);
  }

  async bulkCreate(objects, options = {}) {
    options.extraBodyProperties = {
      ...options.extraBodyProperties,
      spaceId: await this._getSpaceId()
    };

    return await this._client.bulkCreate(objects, options);
  }

  async delete(type, id) {
    return await this._client.delete(type, id);
  }

  async find(options = {}) {
    const spaceOptions = {};

    let types = options.type || this._types;
    if (!Array.isArray(types)) {
      types = [types];
    }

    const spaceId = await this._getSpaceId();
    console.log('got space id', spaceId);

    let minimumShouldMatch = 0;

    const typeClauses = types.map(t => {

      const shouldFilterOnSpace = this._isTypeSpaceAware(t) && spaceId;
      const isDefaultSpace = spaceId === DEFAULT_SPACE_ID;

      const bool = {
        must: []
      };

      if (t) {
        minimumShouldMatch = 1;
        bool.must.push({
          term: {
            type: t
          }
        });
      }

      if (shouldFilterOnSpace) {
        if (isDefaultSpace) {
          bool.must_not = {
            exists: {
              field: "spaceId"
            }
          };
        } else {
          bool.must.push({
            term: {
              spaceId
            }
          });
        }
      }

      return {
        bool
      };
    });

    if (typeClauses.length > 0) {
      spaceOptions.extraQueryParams = {
        bool: {
          should: typeClauses,
          minimum_should_match: minimumShouldMatch
        }
      };
    }

    return await this._client.find({ ...options, ...spaceOptions });
  }

  async bulkGet(objects = []) {
    // ES 'mget' does not support queries, so we have to filter results after the fact.
    const thisSpaceId = await this._getSpaceId();

    const result = await this._client.bulkGet(objects, {
      extraSourceProperties: ['spaceId', 'type']
    });

    result.saved_objects = result.saved_objects.map(savedObject => {
      const { id, type, spaceId } = savedObject;

      if (this._isTypeSpaceAware(type)) {
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

  async get(type, id) {
    // ES 'get' does not support queries, so we have to filter results after the fact.
    let thisSpaceId;

    if (this._isTypeSpaceAware(type)) {
      thisSpaceId = await this._getSpaceId();
    }

    const response = await this._client.get(type, id, {
      extraSourceProperties: ['spaceId']
    });

    const { spaceId: objectSpaceId = DEFAULT_SPACE_ID } = response;

    if (objectSpaceId !== thisSpaceId) {
      throw this._client.errors.createGenericNotFoundError();
    }

    return response;
  }

  async update(type, id, attributes, options = {}) {
    options.extraBodyProperties = {
      ...options.extraBodyProperties,
      spaceId: await this._getSpaceId()
    };
    return await this._client.update(type, id, attributes, options);
  }

  _isTypeSpaceAware(type) {
    return type !== 'space';
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
}
