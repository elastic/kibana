/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, uniq } from 'lodash';
import { CHECK_PRIVILEGES_RESULT } from '../authorization/check_privileges';

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
      securityContextService,
      spacesService,
    } = options;

    this.errors = errors;
    this._actions = actions;
    this._auditLogger = auditLogger;
    this._baseClient = baseClient;
    this._checkPrivileges = checkPrivilegesWithRequest(request);
    this._request = request;
    this._savedObjectTypes = savedObjectTypes;
    this._securityContextService = securityContextService;
    this._spacesService = spacesService;
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

  async delete(type, id) {
    await this._ensureAuthorized(
      type,
      'delete',
      { type, id },
    );

    return await this._baseClient.delete(type, id);
  }

  async find(options = {}) {
    if (options.type) {
      return await this._findWithTypes(options);
    }

    return await this._findAcrossAllTypes(options);
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

  async _checkSavedObjectPrivileges(spaceId, actions) {
    try {
      return await this._checkPrivileges(spaceId, actions);
    } catch(error) {
      const { reason } = get(error, 'body.error', {});
      throw this.errors.decorateGeneralError(error, reason);
    }
  }

  async _ensureAuthorized(typeOrTypes, action, args) {
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const actions = types.map(type => this._actions.getSavedObjectAction(type, action));
    const spaceId = this._spacesService.getSpaceId(this._request);
    const { result, username, response } = await this._checkSavedObjectPrivileges([spaceId], actions);

    switch (result) {
      case CHECK_PRIVILEGES_RESULT.AUTHORIZED:
        this._auditLogger.savedObjectsAuthorizationSuccess(username, action, types, args);
        this._securityContextService.set(this._request, { rbac: true, });
        return;
      case CHECK_PRIVILEGES_RESULT.LEGACY:
        this._securityContextService.set(this._request, { legacy: true, });
        return;
      case CHECK_PRIVILEGES_RESULT.UNAUTHORIZED:
        const missing = this._getMissingPrivileges(response, spaceId);
        this._auditLogger.savedObjectsAuthorizationFailure(username, action, types, missing, args);
        const msg = `Unable to ${action} ${[...types].sort().join(',')}, missing ${[...missing].sort().join(',')}`;
        throw this.errors.decorateForbiddenError(new Error(msg));
      default:
        throw new Error('Unexpected result from hasPrivileges');
    }
  }

  async _findAcrossAllTypes(options) {
    const action = 'find';

    // we have to filter for only their authorized types
    const types = this._savedObjectTypes;
    const typesToPrivilegesMap = new Map(types.map(type => [type, this._actions.getSavedObjectAction(type, action)]));
    const spaceId = this._spacesService.getSpaceId(this._request);
    const { result, username, response } = await this._checkSavedObjectPrivileges([spaceId], Array.from(typesToPrivilegesMap.values()));

    if (result === CHECK_PRIVILEGES_RESULT.LEGACY) {
      this._securityContextService.set(this._request, { legacy: true, });
      return await this._baseClient.find(options);
    }

    const missing = this._getMissingPrivileges(response, spaceId);
    const authorizedTypes = Array.from(typesToPrivilegesMap.entries())
      .filter(([, privilege]) => !missing.includes(privilege))
      .map(([type]) => type);

    if (authorizedTypes.length === 0) {
      this._auditLogger.savedObjectsAuthorizationFailure(
        username,
        action,
        types,
        missing,
        { options }
      );
      throw this.errors.decorateForbiddenError(new Error(`Not authorized to find saved_object`));
    }

    this._auditLogger.savedObjectsAuthorizationSuccess(username, action, authorizedTypes, { options });

    this._securityContextService.set(this._request, { rbac: true, });
    return await this._baseClient.find({
      ...options,
      type: authorizedTypes
    });
  }

  async _findWithTypes(options) {
    await this._ensureAuthorized(
      options.type,
      'find',
      { options },
    );

    return await this._baseClient.find(options);
  }

  _getMissingPrivileges(response, spaceId) {
    return Object.keys(response[spaceId])
      .filter(privilege => !response[spaceId][privilege]);
  }
}
