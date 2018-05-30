/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, uniq } from 'lodash';

export class SecureSavedObjectsClient {
  constructor(options) {
    const {
      request,
      hasPrivilegesWithRequest,
      baseClient,
      auditLogger,
    } = options;

    this.errors = baseClient.errors;

    this._client = baseClient;
    this._hasPrivileges = hasPrivilegesWithRequest(request);
    this._auditLogger = auditLogger;
  }

  async create(type, attributes = {}, options = {}) {
    await this._performAuthorizationCheck(type, 'create', {
      type,
      attributes,
      options,
    });

    return await this._client.create(type, attributes, options);
  }

  async bulkCreate(objects, options = {}) {
    const types = uniq(objects.map(o => o.type));
    await this._performAuthorizationCheck(types, 'create', {
      objects,
      options,
    });

    return await this._client.bulkCreate(objects, options);
  }

  async delete(type, id) {
    await this._performAuthorizationCheck(type, 'delete', {
      type,
      id,
    });

    return await this._client.delete(type, id);
  }

  async find(options = {}) {
    await this._performAuthorizationCheck(options.type, 'search', {
      options,
    });

    return await this._client.find(options);
  }

  async bulkGet(objects = []) {
    const types = uniq(objects.map(o => o.type));
    await this._performAuthorizationCheck(types, 'mget', {
      objects,
    });

    return await this._client.bulkGet(objects);
  }

  async get(type, id) {
    await this._performAuthorizationCheck(type, 'get', {
      type,
      id,
    });

    return await this._client.get(type, id);
  }

  async update(type, id, attributes, options = {}) {
    await this._performAuthorizationCheck(type, 'update', {
      type,
      id,
      attributes,
      options,
    });

    return await this._client.update(type, id, attributes, options);
  }

  async _performAuthorizationCheck(typeOrTypes, action, args) {
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const actions = types.map(type => `action:saved-objects/${type}/${action}`);

    let result;
    try {
      result = await this._hasPrivileges(actions);
    } catch(error) {
      const { reason } = get(error, 'body.error', {});
      throw this._client.errors.decorateGeneralError(error, reason);
    }

    if (result.success) {
      this._auditLogger.savedObjectsAuthorizationSuccess(result.username, action, types, args);
    } else {
      this._auditLogger.savedObjectsAuthorizationFailure(result.username, action, types, result.missing);
      const msg = `Unable to ${action} ${types.join(',')}, missing ${result.missing.join(',')}`;
      throw this._client.errors.decorateForbiddenError(new Error(msg));
    }
  }
}
