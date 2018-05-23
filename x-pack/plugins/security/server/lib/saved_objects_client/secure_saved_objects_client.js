/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, uniq } from 'lodash';

export class SecureSavedObjectsClient {
  constructor({
    errors,
    repository,
    hasPrivileges,
  }) {
    this.errors = errors;
    this._repository = repository;
    this._hasPrivileges = hasPrivileges;
  }

  async create(type, attributes = {}, options = {}) {
    await this._performAuthorizationCheck(type, 'create');

    return await this._repository.create(type, attributes, options);
  }

  async bulkCreate(objects, options = {}) {
    const types = uniq(objects.map(o => o.type));
    await this._performAuthorizationCheck(types, 'create');

    return await this._repository.bulkCreate(objects, options);
  }

  async delete(type, id) {
    await this._performAuthorizationCheck(type, 'delete');

    return await this._repository.delete(type, id);
  }

  async find(options = {}) {
    await this._performAuthorizationCheck(options.type, 'search');

    return await this._repository.find(options);
  }

  async bulkGet(objects = []) {
    for (const object of objects) {
      await this._performAuthorizationCheck(object.type, 'mget');
    }

    return await this._repository.bulkGet(objects);
  }

  async get(type, id) {
    await this._performAuthorizationCheck(type, 'get');

    return await this._repository.get(type, id);
  }

  async update(type, id, attributes, options = {}) {
    await this._performAuthorizationCheck(type, 'update');

    return await this._repository.update(type, id, attributes, options);
  }

  async _performAuthorizationCheck(typeOrTypes, action) {
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const actions = types.map(type => `action:saved-objects/${type}/${action}`);

    let result;
    try {
      result = await this._hasPrivileges(actions);
    } catch(error) {
      const { reason } = get(error, 'body.error', {});
      throw this.errors.decorateGeneralError(error, reason);
    }

    if (!result.success) {
      const msg = `Unable to ${action} ${types.join(',')}, missing ${result.missing.join(',')}`;
      throw this.errors.decorateForbiddenError(new Error(msg));
    }
  }
}
