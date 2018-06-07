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
      repository,
      hasPrivileges,
      auditLogger,
    } = options;

    this.errors = errors;
    this._repository = repository;
    this._hasPrivileges = hasPrivileges;
    this._auditLogger = auditLogger;
  }

  async create(type, attributes = {}, options = {}) {
    await this._performAuthorizationCheck(type, 'create', {
      type,
      attributes,
      options,
    });

    return await this._repository.create(type, attributes, options);
  }

  async bulkCreate(objects, options = {}) {
    const types = uniq(objects.map(o => o.type));
    await this._performAuthorizationCheck(types, 'bulk_create', {
      objects,
      options,
    });

    return await this._repository.bulkCreate(objects, options);
  }

  async delete(type, id) {
    await this._performAuthorizationCheck(type, 'delete', {
      type,
      id,
    });

    return await this._repository.delete(type, id);
  }

  async find(options = {}) {
    const action = 'find';

    // when we have the type or types, it makes our life easy
    if (options.type) {
      await this._performAuthorizationCheck(options.type, action, { options });
      return await this._repository.find(options);
    }

    // otherwise, we have to filter for only their authorized types
    const types = this._repository.getTypes();
    const typesToPrivilegesMap = new Map(types.map(type => [type, getPrivilege(type, action)]));
    const hasPrivilegesResult = await this._hasSavedObjectPrivileges(Array.from(typesToPrivilegesMap.values()));
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

    return await this._repository.find({
      ...options,
      type: authorizedTypes
    });
  }

  async bulkGet(objects = []) {
    const types = uniq(objects.map(o => o.type));
    await this._performAuthorizationCheck(types, 'bulk_get', {
      objects,
    });

    return await this._repository.bulkGet(objects);
  }

  async get(type, id) {
    await this._performAuthorizationCheck(type, 'get', {
      type,
      id,
    });

    return await this._repository.get(type, id);
  }

  async update(type, id, attributes, options = {}) {
    await this._performAuthorizationCheck(type, 'update', {
      type,
      id,
      attributes,
      options,
    });

    return await this._repository.update(type, id, attributes, options);
  }

  async _performAuthorizationCheck(typeOrTypes, action, args) {
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const privileges = types.map(type => getPrivilege(type, action));
    const result = await this._hasSavedObjectPrivileges(privileges);

    if (result.success) {
      this._auditLogger.savedObjectsAuthorizationSuccess(result.username, action, types, args);
    } else {
      this._auditLogger.savedObjectsAuthorizationFailure(result.username, action, types, result.missing, args);
      const msg = `Unable to ${action} ${types.sort().join(',')}, missing ${result.missing.sort().join(',')}`;
      throw this.errors.decorateForbiddenError(new Error(msg));
    }
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
