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
  SavedObjectsUpdateNamespacesOptions,
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

interface SavedObjectNamespaces {
  namespaces?: string[];
}

interface SavedObjectsNamespaces {
  saved_objects: SavedObjectNamespaces[];
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set<T>(arr));
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

    const savedObject = await this.baseClient.create(type, attributes, options);
    return await this.filterSavedObjectNamespaces(savedObject);
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

    const response = await this.baseClient.bulkCreate(objects, options);
    return await this.filterSavedObjectsNamespaces(response);
  }

  public async delete(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    await this.ensureAuthorized(type, 'delete', options.namespace, { type, id, options });

    return await this.baseClient.delete(type, id, options);
  }

  public async find(options: SavedObjectsFindOptions) {
    await this.ensureAuthorized(options.type, 'find', options.namespace, { options });

    const response = await this.baseClient.find(options);
    return await this.filterSavedObjectsNamespaces(response);
  }

  public async bulkGet(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    await this.ensureAuthorized(this.getUniqueObjectTypes(objects), 'bulk_get', options.namespace, {
      objects,
      options,
    });

    const response = await this.baseClient.bulkGet(objects, options);
    return await this.filterSavedObjectsNamespaces(response);
  }

  public async get(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    await this.ensureAuthorized(type, 'get', options.namespace, { type, id, options });

    const savedObject = await this.baseClient.get(type, id, options);
    return await this.filterSavedObjectNamespaces(savedObject);
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

    const savedObject = await this.baseClient.update(type, id, attributes, options);
    return await this.filterSavedObjectNamespaces(savedObject);
  }

  public async updateNamespaces(
    type: string,
    id: string,
    namespaces: string[],
    options: SavedObjectsUpdateNamespacesOptions = {}
  ) {
    const existingSavedObject = await this.baseClient.get(type, id);
    const allNamespaces = [...new Set([...namespaces, ...existingSavedObject.namespaces!])];
    try {
      const checkPrivilegesResult = await this.checkSavedObjectsPrivilegesAsCurrentUser.atNamespaces(
        'update',
        allNamespaces
      );
      const args = {
        type,
        id,
        namespaces,
        options,
      };
      if (!checkPrivilegesResult.hasAllRequested) {
        this.auditLogger.savedObjectsAuthorizationFailure(
          checkPrivilegesResult.username,
          'updateNamespaces',
          [type],
          ['update'],
          args
        );
        throw this.errors.decorateForbiddenError(new Error('Unable to updateNamespaces'));
      }
      this.auditLogger.savedObjectsAuthorizationSuccess(
        checkPrivilegesResult.username,
        'updateNamespaces',
        [type],
        args
      );
    } catch (error) {
      throw this.errors.decorateGeneralError(error, error.body && error.body.reason);
    }

    return await this.baseClient.updateNamespaces(type, id, namespaces, options);
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

    const response = await this.baseClient.bulkUpdate(objects, options);
    return await this.filterSavedObjectsNamespaces(response);
  }

  private async checkPrivileges(actions: string | string[], namespace?: string) {
    try {
      return await this.checkSavedObjectsPrivilegesAsCurrentUser.dynamically(actions, namespace);
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

  private async filterSavedObjectNamespaces<T extends SavedObjectNamespaces>(
    savedObject: T
  ): Promise<T> {
    if (savedObject.namespaces == null) {
      return savedObject;
    }

    const action = this.actions.login;
    const checkPrivilegesResult = await this.checkSavedObjectsPrivilegesAsCurrentUser.atNamespaces(
      action,
      savedObject.namespaces
    );
    const filteredNamespaces = Object.entries(
      checkPrivilegesResult.spacePrivileges
    ).map(([spaceId, privileges]) => (privileges[action] === true ? spaceId : '?'));
    return {
      ...savedObject,
      namespaces: filteredNamespaces,
    };
  }

  private async filterSavedObjectsNamespaces<T extends SavedObjectsNamespaces>(
    response: T
  ): Promise<T> {
    const { saved_objects: savedObjects } = response;
    const namespaces = uniq(savedObjects.flatMap(savedObject => savedObject.namespaces || []));
    if (namespaces.length === 0) {
      return {
        ...response,
        saved_objects: savedObjects,
      };
    }

    const action = this.actions.login;
    const checkPrivilegesResult = await this.checkSavedObjectsPrivilegesAsCurrentUser.atNamespaces(
      action,
      namespaces
    );
    const authorizedNamespaces = Object.entries(checkPrivilegesResult.spacePrivileges)
      .filter(([, privileges]) => privileges[action] === true)
      .map(([spaceId]) => spaceId);
    return {
      ...response,
      saved_objects: savedObjects.map(savedObject => ({
        ...savedObject,
        namespaces:
          savedObject.namespaces &&
          savedObject.namespaces.map(namespace =>
            authorizedNamespaces.includes(namespace) ? namespace : '?'
          ),
      })),
    };
  }
}
