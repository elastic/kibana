/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectAttributes,
  SavedObjectsBaseOptions,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsClientContract,
  SavedObjectsCreateOptions,
  SavedObjectsFindOptions,
  SavedObjectsUpdateOptions,
} from '../../../../../src/core/server';
import { SecurityAuditLogger } from '../audit';
import { Actions, CheckSavedObjectsPrivileges } from '../authorization';

interface SecureSavedObjectsClientWrapperOptions {
  actions: Actions;
  auditLogger: SecurityAuditLogger;
  baseClient: SavedObjectsClientContract;
  errors: SavedObjectsClientContract['errors'];
  checkSavedObjectsPrivilegesAsCurrentUser: CheckSavedObjectsPrivileges;
}

export class SecureSavedObjectsClientWrapper implements SavedObjectsClientContract {
  private readonly actions: Actions;
  private readonly auditLogger: PublicMethodsOf<SecurityAuditLogger>;
  private readonly baseClient: SavedObjectsClientContract;
  private readonly checkSavedObjectsPrivilegesAsCurrentUser: CheckSavedObjectsPrivileges;
  public readonly errors: SavedObjectsClientContract['errors'];
  constructor({
    actions,
    auditLogger,
    baseClient,
    checkSavedObjectsPrivilegesAsCurrentUser,
    errors,
  }: SecureSavedObjectsClientWrapperOptions) {
    this.errors = errors;
    this.actions = actions;
    this.auditLogger = auditLogger;
    this.baseClient = baseClient;
    this.checkSavedObjectsPrivilegesAsCurrentUser = checkSavedObjectsPrivilegesAsCurrentUser;
  }

  public async create<T extends SavedObjectAttributes>(
    type: string,
    attributes: T = {} as T,
    options: SavedObjectsCreateOptions = {}
  ) {
    await this.ensureAuthorized(type, 'create', options.namespace, { type, attributes, options });

    return await this.baseClient.create(type, attributes, options);
  }

  public async bulkCreate(
    objects: SavedObjectsBulkCreateObject[],
    options: SavedObjectsBaseOptions = {}
  ) {
    await this.ensureAuthorized(
      this.getUniqueObjectTypes(objects),
      'bulk_create',
      options.namespace,
      { objects, options }
    );

    return await this.baseClient.bulkCreate(objects, options);
  }

  public async delete(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    await this.ensureAuthorized(type, 'delete', options.namespace, { type, id, options });

    return await this.baseClient.delete(type, id, options);
  }

  public async find(options: SavedObjectsFindOptions) {
    await this.ensureAuthorized(options.type, 'find', options.namespace, { options });

    return this.baseClient.find(options);
  }

  public async bulkGet(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    await this.ensureAuthorized(this.getUniqueObjectTypes(objects), 'bulk_get', options.namespace, {
      objects,
      options,
    });

    return await this.baseClient.bulkGet(objects, options);
  }

  public async get(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    await this.ensureAuthorized(type, 'get', options.namespace, { type, id, options });

    return await this.baseClient.get(type, id, options);
  }

  public async update<T extends SavedObjectAttributes>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions = {}
  ) {
    await this.ensureAuthorized(type, 'update', options.namespace, {
      type,
      id,
      attributes,
      options,
    });

    return await this.baseClient.update(type, id, attributes, options);
  }

  public async bulkUpdate(
    objects: SavedObjectsBulkUpdateObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    await this.ensureAuthorized(
      this.getUniqueObjectTypes(objects),
      'bulk_update',
      options && options.namespace,
      { objects, options }
    );

    return await this.baseClient.bulkUpdate(objects, options);
  }

  private async checkPrivileges(actions: string | string[], namespace?: string) {
    try {
      return await this.checkSavedObjectsPrivilegesAsCurrentUser(actions, namespace);
    } catch (error) {
      throw this.errors.decorateGeneralError(error, error.body && error.body.reason);
    }
  }

  private async ensureAuthorized(
    typeOrTypes: string | string[],
    action: string,
    namespace?: string,
    args?: Record<string, unknown>
  ) {
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const actionsToTypesMap = new Map(
      types.map(type => [this.actions.savedObject.get(type, action), type])
    );
    const actions = Array.from(actionsToTypesMap.keys());
    const { hasAllRequested, username, privileges } = await this.checkPrivileges(
      actions,
      namespace
    );

    if (hasAllRequested) {
      this.auditLogger.savedObjectsAuthorizationSuccess(username, action, types, args);
    } else {
      const missingPrivileges = this.getMissingPrivileges(privileges);
      this.auditLogger.savedObjectsAuthorizationFailure(
        username,
        action,
        types,
        missingPrivileges,
        args
      );
      const msg = `Unable to ${action} ${missingPrivileges
        .map(privilege => actionsToTypesMap.get(privilege))
        .sort()
        .join(',')}`;
      throw this.errors.decorateForbiddenError(new Error(msg));
    }
  }

  private getMissingPrivileges(privileges: Record<string, boolean>) {
    return Object.keys(privileges).filter(privilege => !privileges[privilege]);
  }

  private getUniqueObjectTypes(objects: Array<{ type: string }>) {
    return [...new Set(objects.map(o => o.type))];
  }
}
