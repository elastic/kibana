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
      checkPrivilegesWithRequest,
      errors,
      request,
      savedObjectTypes,
      spaces,
    } = options;

    this.errors = errors;
    this._actions = actions;
    this._auditLogger = auditLogger;
    this._baseClient = baseClient;
    this._checkPrivileges = checkPrivilegesWithRequest(request);
    this._request = request;
    this._savedObjectTypes = savedObjectTypes;
    this._spaces = spaces;
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

  async bulkGet(objects = [], options = {}) {
    const types = uniq(objects.map(o => o.type));
    await this._ensureAuthorized(
      types,
      'bulk_get',
      { objects, options },
    );

    return await this._baseClient.bulkGet(objects, options);
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

  async findRelationships(type, id, options = {}) {
    await this._ensureAuthorized(
      type,
      'find_relationships',
      { type, id, options },
    );
    let { filterTypes } = options;
    const authorizedTypes = await this._getAuthorizedTypes(this._savedObjectTypes, 'find_relationships');
    // Go through filterTypes array and ensure each value is in authorizedTypes.
    // Or else we'll filter on what they're authorized to see.
    filterTypes = filterTypes
      ? authorizedTypes.filter(type => filterTypes.includes(type))
      : authorizedTypes;
    return await this._baseClient.findRelationships(type, id, {
      ...options,
      filterTypes,
    });
  }

  async _checkSavedObjectPrivileges(actions) {
    try {
      if (this._spaces) {
        const spaceId = this._spaces.getSpaceId(this._request);
        return await this._checkPrivileges.atSpace(spaceId, actions);
      }
      else {
        return await this._checkPrivileges.globally(actions);
      }
    } catch(error) {
      const { reason } = get(error, 'body.error', {});
      throw this.errors.decorateGeneralError(error, reason);
    }
  }

  async _getAuthorizedTypes(typeOrTypes, action) {
    const actionMap = {};
    const types = [].concat(typeOrTypes);
    types.forEach((type) => {
      const typeAction = this._actions.getSavedObjectAction(type, action);
      actionMap[typeAction] = type;
    });
    const { privileges } = await this._checkSavedObjectPrivileges(Object.keys(actionMap));
    const authorizedTypes = Object.keys(privileges)
      .map(privilege => {
        const authorized = privileges[privilege];
        if (authorized) return actionMap[privilege];
      })
      .filter(value => !!value);
    return authorizedTypes;
  }

  async _ensureAuthorized(typeOrTypes, action, args) {
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const actions = types.map(type => this._actions.getSavedObjectAction(type, action));
    const { hasAllRequested, username, privileges } = await this._checkSavedObjectPrivileges(actions);

    if (hasAllRequested) {
      this._auditLogger.savedObjectsAuthorizationSuccess(username, action, types, args);
    } else {
      const missing = this._getMissingPrivileges(privileges);
      this._auditLogger.savedObjectsAuthorizationFailure(
        username,
        action,
        types,
        missing,
        args
      );
      const msg = `Unable to ${action} ${[...types].sort().join(',')}, missing ${[...missing].sort().join(',')}`;
      throw this.errors.decorateForbiddenError(new Error(msg));
    }
  }

  _getMissingPrivileges(response) {
    return Object.keys(response).filter(privilege => !response[privilege]);
  }
}
