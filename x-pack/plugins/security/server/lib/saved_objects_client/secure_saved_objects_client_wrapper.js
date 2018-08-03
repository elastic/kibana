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
    } = options;

    this.errors = errors;
    this._actions = actions;
    this._auditLogger = auditLogger;
    this._baseClient = baseClient;
    this._checkPrivileges = checkPrivilegesWithRequest(request);
    this._request = request;
    this._savedObjectTypes = savedObjectTypes;
    this._securityContextService = securityContextService;
  }

  async create(type, attributes = {}, options = {}) {
    return await this._execute(
      type,
      'create',
      { type, attributes, options },
      client => client.create(type, attributes, options),
    );
  }

  async bulkCreate(objects, options = {}) {
    const types = uniq(objects.map(o => o.type));
    return await this._execute(
      types,
      'bulk_create',
      { objects, options },
      client => client.bulkCreate(objects, options),
    );
  }

  async delete(type, id) {
    return await this._execute(
      type,
      'delete',
      { type, id },
      client => client.delete(type, id),
    );
  }

  async find(options = {}) {
    if (options.type) {
      return await this._findWithTypes(options);
    }

    return await this._findAcrossAllTypes(options);
  }

  async bulkGet(objects = [], options = {}) {
    const types = uniq(objects.map(o => o.type));
    return await this._execute(
      types,
      'bulk_get',
      { objects, options },
      client => client.bulkGet(objects, options)
    );
  }

  async get(type, id, options = {}) {
    return await this._execute(
      type,
      'get',
      { type, id, options },
      client => client.get(type, id, options)
    );
  }

  async update(type, id, attributes, options = {}) {
    return await this._execute(
      type,
      'update',
      { type, id, attributes, options },
      client => client.update(type, id, attributes, options)
    );
  }

  async _checkSavedObjectPrivileges(actions) {
    try {
      return await this._checkPrivileges(actions);
    } catch(error) {
      const { reason } = get(error, 'body.error', {});
      throw this.errors.decorateGeneralError(error, reason);
    }
  }

  async _execute(typeOrTypes, action, args, fn) {
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const actions = types.map(type => this._actions.getSavedObjectAction(type, action));
    const { result, username, missing } = await this._checkSavedObjectPrivileges(actions);

    switch (result) {
      case CHECK_PRIVILEGES_RESULT.AUTHORIZED:
        this._auditLogger.savedObjectsAuthorizationSuccess(username, action, types, args);
        this._securityContextService.set(this._request, { rbac: true, });
        return await fn(this._baseClient);
      case CHECK_PRIVILEGES_RESULT.LEGACY:
        this._securityContextService.set(this._request, { legacy: true, });
        return await fn(this._baseClient);
      case CHECK_PRIVILEGES_RESULT.UNAUTHORIZED:
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
    const { result, username, missing } = await this._checkSavedObjectPrivileges(Array.from(typesToPrivilegesMap.values()));

    if (result === CHECK_PRIVILEGES_RESULT.LEGACY) {
      this._securityContextService.set(this._request, { legacy: true, });
      return await this._baseClient.find(options);
    }

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
    return await this._execute(
      options.type,
      'find',
      { options },
      client => client.find(options)
    );
  }
}
