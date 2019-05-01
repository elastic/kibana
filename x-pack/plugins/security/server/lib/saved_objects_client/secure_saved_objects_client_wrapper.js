/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, uniq } from 'lodash';

export class SecureSavedObjectsClientWrapper {
  constructor(options) {
    const {
      actions,
      auditLogger,
      baseClient,
      checkPrivilegesDynamicallyWithRequest,
      errors,
      request,
      savedObjectTypes,
    } = options;

    this.errors = errors;
    this._actions = actions;
    this._auditLogger = auditLogger;
    this._baseClient = baseClient;
    this._checkPrivileges = checkPrivilegesDynamicallyWithRequest(request);
    this._request = request;
    this._savedObjectTypes = savedObjectTypes;
  }

  async create(type, attributes = {}, options = {}) {
    await this._ensureAuthorized(
      type,
      'create',
      { type, attributes, options },
    );

    return await this._baseClient.create(type, attributes, options);
  }

  async bulkCreate(objects, options = {}) {
    const types = uniq(objects.map(o => o.type));
    await this._ensureAuthorized(
      types,
      'bulk_create',
      { objects, options },
    );

    return await this._baseClient.bulkCreate(objects, options);
  }

  async canBulkCreate(objects, options = {}) {
    const types = uniq(objects.map(o => o.type));
    return await this._checkSavedObjectPrivileges(types, 'bulk_create', { objects, options });
  }

  async delete(type, id, options) {
    await this._ensureAuthorized(
      type,
      'delete',
      { type, id, options },
    );

    return await this._baseClient.delete(type, id, options);
  }

  async find(options = {}) {
    await this._ensureAuthorized(
      options.type,
      'find',
      { options }
    );

    return this._baseClient.find(options);
  }

  async canFind(options = {}) {
    return await this._checkSavedObjectPrivileges(options.type, 'find', { options });
  }

  async bulkGet(objects = [], options = {}) {
    const types = uniq(objects.map(o => o.type));
    await this._ensureAuthorized(
      types,
      'bulk_get',
      { objects, options },
    );

    return await this._baseClient.bulkGet(objects, options);
  }

  async canBulkGet(objects = [], options = {}) {
    const types = uniq(objects.map(o => o.type));
    return await this._checkSavedObjectPrivileges(types, 'bulk_get', { objects, options });
  }

  async get(type, id, options = {}) {
    await this._ensureAuthorized(
      type,
      'get',
      { type, id, options },
    );

    return await this._baseClient.get(type, id, options);
  }

  async update(type, id, attributes, options = {}) {
    await this._ensureAuthorized(
      type,
      'update',
      { type, id, attributes, options },
    );

    return await this._baseClient.update(type, id, attributes, options);
  }

  async _checkSavedObjectPrivileges(typeOrTypes, action, args) {
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const actionsToTypesMap = new Map(types.map(type => [this._actions.savedObject.get(type, action), type]));
    const actions = Array.from(actionsToTypesMap.keys());

    // Check privileges
    let result;
    try {
      result = await this._checkPrivileges(actions);
    } catch(error) {
      const { reason } = get(error, 'body.error', {});
      throw this.errors.decorateGeneralError(error, reason);
    }

    // Log to audit and return array of types that are authorized
    let typesMissingPrivileges = [];
    if (result.hasAllRequested) {
      this._auditLogger.savedObjectsAuthorizationSuccess(result.username, action, types, args);
    } else {
      const missingPrivileges = this._getMissingPrivileges(result.privileges);
      this._auditLogger.savedObjectsAuthorizationFailure(
        result.username,
        action,
        types,
        missingPrivileges,
        args
      );
      typesMissingPrivileges = missingPrivileges.map(privilege => actionsToTypesMap.get(privilege));
    }
    return types.map(type => ({
      type,
      can: !typesMissingPrivileges.includes(type),
    }));
  }

  async _ensureAuthorized(typeOrTypes, action, args) {
    const result = await this._checkSavedObjectPrivileges(typeOrTypes, action, args);
    const unauthorizedTypes = result
      .filter(obj => obj.can === false)
      .map(obj => obj.type);
    if (unauthorizedTypes.length) {
      const msg = `Unable to ${action} ${unauthorizedTypes.sort().join(',')}`;
      throw this.errors.decorateForbiddenError(new Error(msg));
    }
  }

  _getMissingPrivileges(response) {
    return Object.keys(response).filter(privilege => !response[privilege]);
  }
}
