/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */

import { get, uniq } from 'lodash';

export class SecureSavedObjectsClient {
  constructor(options) {
    const {
      request,
      requestHasPrivileges,
      baseClient,
    } = options;

    this.errors = baseClient.errors;

    this._client = baseClient;
    this._hasPrivileges = requestHasPrivileges(request);
  }

  async create(type, attributes = {}, options = {}) {
    await this._performAuthorizationCheck(type, 'create');

    return await this._client.create(type, attributes, options);
  }

  async bulkCreate(objects, options = {}) {
    const types = uniq(objects.map(o => o.type));
    await this._performAuthorizationCheck(types, 'create');

    return await this._client.bulkCreate(objects, options);
  }

  async delete(type, id) {
    await this._performAuthorizationCheck(type, 'delete');

    return await this._client.delete(type, id);
  }

  async find(options = {}) {
    await this._performAuthorizationCheck(options.type, 'search');

    return await this._client.find(options);
  }

  async bulkGet(objects = []) {
    for (const object of objects) {
      await this._performAuthorizationCheck(object.type, 'mget');
    }

    return await this._client.bulkGet(objects);
  }

  async get(type, id) {
    await this._performAuthorizationCheck(type, 'get');

    return await this._client.get(type, id);
  }

  async update(type, id, attributes, options = {}) {
    await this._performAuthorizationCheck(type, 'update');

    return await this._client.update(type, id, attributes, options);
  }

  async _performAuthorizationCheck(typeOrTypes, action) {
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const actions = types.map(type => `action:saved-objects/${type}/${action}`);

    let result;
    try {
      result = await this._hasPrivileges(actions);
    } catch(error) {
      const { reason } = get(error, 'body.error', {});
      throw this._client.errors.decorateGeneralError(error, reason);
    }

    if (!result.success) {
      const msg = `Unable to ${action} ${types.join(',')}, missing ${result.missing.join(',')}`;
      throw this._client.errors.decorateForbiddenError(new Error(msg));
    }
  }
}
