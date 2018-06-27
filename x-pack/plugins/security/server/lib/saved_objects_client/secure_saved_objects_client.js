/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, uniq } from 'lodash';

const getPrivilege = (type, action) => {
  return `action:saved_objects/${type}/${action}`;
};

export class SecureSavedObjectsClient {
  constructor(options) {
    const {
      errors,
      internalRepository,
      callWithRequestRepository,
      hasPrivileges,
      auditLogger,
      savedObjectTypes,
    } = options;

    this.errors = errors;
    this._internalRepository = internalRepository;
    this._callWithRequestRepository = callWithRequestRepository;
    this._hasPrivileges = hasPrivileges;
    this._auditLogger = auditLogger;
    this._savedObjectTypes = savedObjectTypes;
  }

  async create(type, attributes = {}, options = {}) {
    const authorized = await this._performAuthorizationCheck(type, 'create', {
      type,
      attributes,
      options,
    });

    if (authorized) {
      return await this._internalRepository.create(type, attributes, options);
    }

    return await this._callWithRequestRepository.create(type, attributes, options);
  }

  async bulkCreate(objects, options = {}) {
    const types = uniq(objects.map(o => o.type));
    const authorized = await this._performAuthorizationCheck(types, 'bulk_create', {
      objects,
      options,
    });

    if (authorized) {
      return await this._internalRepository.bulkCreate(objects, options);
    }

    return await this._callWithRequestRepository.bulkCreate(objects, options);
  }

  async delete(type, id) {
    const authorized = await this._performAuthorizationCheck(type, 'delete', {
      type,
      id,
    });

    if (authorized) {
      return await this._internalRepository.delete(type, id);
    }

    return await this._callWithRequestRepository.delete(type, id);
  }

  async find(options = {}) {
    if (options.type) {
      return await this._findWithTypes(options);
    }

    return await this._findAcrossAllTypes(options);
  }

  async _findWithTypes(options) {
    // when we're finding specific types, we just ensure the user can find the specified types
    const authorized = await this._performAuthorizationCheck(options.type, 'find', { options });

    if (authorized) {
      return await this._internalRepository.find(options);
    }

    return await this._callWithRequestRepository.find(options);
  }

  async _findAcrossAllTypes(options) {
    const action = 'find';

    // we have to filter for only their authorized types
    const types = this._savedObjectTypes;
    const typesToPrivilegesMap = new Map(types.map(type => [type, getPrivilege(type, action)]));
    const hasPrivilegesResult = await this._hasSavedObjectPrivileges(Array.from(typesToPrivilegesMap.values()));

    // if they don't have any application privileges, we fallback to searching as the authenticated user
    if (hasPrivilegesResult.useLegacyFallback) {
      return await this._callWithRequestRepository.find(options);
    }

    const authorizedTypes = Array.from(typesToPrivilegesMap.entries())
      .filter(([ , privilege]) => !hasPrivilegesResult.missing.includes(privilege))
      .map(([type]) => type);

    if (authorizedTypes.length === 0) {
      this._auditLogger.savedObjectsAuthorizationFailure(
        hasPrivilegesResult.username,
        action,
        types,
        hasPrivilegesResult.missing,
        { options }
      );
      throw this.errors.decorateForbiddenError(new Error(`Not authorized to find saved_object`));
    }
    this._auditLogger.savedObjectsAuthorizationSuccess(hasPrivilegesResult.username, action, authorizedTypes, { options });

    return await this._internalRepository.find({
      ...options,
      type: authorizedTypes
    });
  }

  async bulkGet(objects = []) {
    const types = uniq(objects.map(o => o.type));
    const authorized = await this._performAuthorizationCheck(types, 'bulk_get', {
      objects,
    });

    if (authorized) {
      return await this._internalRepository.bulkGet(objects);
    }

    return await this._callWithRequestRepository.bulkGet(objects);
  }

  async get(type, id) {
    const authorized = await this._performAuthorizationCheck(type, 'get', {
      type,
      id,
    });

    if (authorized) {
      return await this._internalRepository.get(type, id);
    }

    return await this._callWithRequestRepository.get(type, id);
  }

  async update(type, id, attributes, options = {}) {
    const authorized = await this._performAuthorizationCheck(type, 'update', {
      type,
      id,
      attributes,
      options,
    });

    if (authorized) {
      return await this._internalRepository.update(type, id, attributes, options);
    }

    return await this._callWithRequestRepository.update(type, id, attributes, options);
  }

  async _performAuthorizationCheck(typeOrTypes, action, args) {
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const privileges = types.map(type => getPrivilege(type, action));
    const result = await this._hasSavedObjectPrivileges(privileges);

    if (result.success) {
      this._auditLogger.savedObjectsAuthorizationSuccess(result.username, action, types, args);
      return true;
    }

    this._auditLogger.savedObjectsAuthorizationFailure(result.username, action, types, result.missing, result.useLegacyFallback, args);

    if (result.useLegacyFallback) {
      return false;
    }

    const msg = `Unable to ${action} ${types.sort().join(',')}, missing ${result.missing.sort().join(',')}`;
    throw this.errors.decorateForbiddenError(new Error(msg));
  }

  async _hasSavedObjectPrivileges(privileges) {
    try {
      return await this._hasPrivileges(privileges);
    } catch(error) {
      const { reason } = get(error, 'body.error', {});
      throw this.errors.decorateGeneralError(error, reason);
    }
  }
}
