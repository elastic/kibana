/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, uniq } from 'lodash';
import { HAS_PRIVILEGES_RESULT } from '../authorization/has_privileges';

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
    return await this._execute(
      type,
      'create',
      { type, attributes, options },
      repository => repository.create(type, attributes, options),
    );
  }

  async bulkCreate(objects, options = {}) {
    const types = uniq(objects.map(o => o.type));
    return await this._execute(
      types,
      'bulk_create',
      { objects, options },
      repository => repository.bulkCreate(objects, options),
    );
  }

  async delete(type, id) {
    return await this._execute(
      type,
      'delete',
      { type, id },
      repository => repository.delete(type, id),
    );
  }

  async find(options = {}) {
    if (options.type) {
      return await this._findWithTypes(options);
    }

    return await this._findAcrossAllTypes(options);
  }

  async _findWithTypes(options) {
    return await this._execute(
      options.type,
      'find',
      { options },
      repository => repository.find(options)
    );
  }

  async bulkGet(objects = []) {
    const types = uniq(objects.map(o => o.type));
    return await this._execute(
      types,
      'bulk_get',
      { objects },
      repository => repository.bulkGet(objects)
    );
  }

  async get(type, id) {
    return await this._execute(
      type,
      'get',
      { type, id },
      repository => repository.get(type, id)
    );
  }

  async update(type, id, attributes, options = {}) {
    return await this._execute(
      type,
      'update',
      { type, id, attributes, options },
      repository => repository.update(type, id, attributes, options)
    );
  }

  async _execute(typeOrTypes, action, args, fn) {
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const privileges = types.map(type => getPrivilege(type, action));
    const { result, username, missing } = await this._hasSavedObjectPrivileges(privileges);

    switch (result) {
      case HAS_PRIVILEGES_RESULT.AUTHORIZED:
        this._auditLogger.savedObjectsAuthorizationSuccess(username, action, types, args);
        return await fn(this._internalRepository);
      case HAS_PRIVILEGES_RESULT.LEGACY:
        return await fn(this._callWithRequestRepository);
      case HAS_PRIVILEGES_RESULT.UNAUTHORIZED:
        this._auditLogger.savedObjectsAuthorizationFailure(username, action, types, missing, args);
        const msg = `Unable to ${action} ${types.sort().join(',')}, missing ${missing.sort().join(',')}`;
        throw this.errors.decorateForbiddenError(new Error(msg));
      default:
        throw new Error('Unexpected result from hasPrivileges');
    }
  }

  async _findAcrossAllTypes(options) {
    const action = 'find';

    // we have to filter for only their authorized types
    const types = this._savedObjectTypes;
    const typesToPrivilegesMap = new Map(types.map(type => [type, getPrivilege(type, action)]));
    const { result, username, missing } = await this._hasSavedObjectPrivileges(Array.from(typesToPrivilegesMap.values()));

    if (result === HAS_PRIVILEGES_RESULT.LEGACY) {
      return await this._callWithRequestRepository.find(options);
    }

    const authorizedTypes = Array.from(typesToPrivilegesMap.entries())
      .filter(([ , privilege]) => !missing.includes(privilege))
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

    return await this._internalRepository.find({
      ...options,
      type: authorizedTypes
    });
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
