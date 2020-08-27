/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsBaseOptions,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsCheckConflictsObject,
  SavedObjectsClientContract,
  SavedObjectsCreateOptions,
  SavedObjectsFindOptions,
  SavedObjectsUpdateOptions,
  SavedObjectsAddToNamespacesOptions,
  SavedObjectsDeleteFromNamespacesOptions,
} from '../../../../../src/core/server';
import { SecurityAuditLogger } from '../audit';
import { Actions, CheckSavedObjectsPrivileges } from '../authorization';
import { CheckPrivilegesResponse } from '../authorization/check_privileges';
import { SpacesService } from '../plugin';

interface SecureSavedObjectsClientWrapperOptions {
  actions: Actions;
  auditLogger: SecurityAuditLogger;
  baseClient: SavedObjectsClientContract;
  errors: SavedObjectsClientContract['errors'];
  checkSavedObjectsPrivilegesAsCurrentUser: CheckSavedObjectsPrivileges;
  getSpacesService(): SpacesService | undefined;
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
  private getSpacesService: () => SpacesService | undefined;
  public readonly errors: SavedObjectsClientContract['errors'];

  constructor({
    actions,
    auditLogger,
    baseClient,
    checkSavedObjectsPrivilegesAsCurrentUser,
    errors,
    getSpacesService,
  }: SecureSavedObjectsClientWrapperOptions) {
    this.errors = errors;
    this.actions = actions;
    this.auditLogger = auditLogger;
    this.baseClient = baseClient;
    this.checkSavedObjectsPrivilegesAsCurrentUser = checkSavedObjectsPrivilegesAsCurrentUser;
    this.getSpacesService = getSpacesService;
  }

  public async create<T = unknown>(
    type: string,
    attributes: T = {} as T,
    options: SavedObjectsCreateOptions = {}
  ) {
    await this.ensureAuthorized(type, 'create', options.namespace, { type, attributes, options });

    const savedObject = await this.baseClient.create(type, attributes, options);
    return await this.redactSavedObjectNamespaces(savedObject);
  }

  public async checkConflicts(
    objects: SavedObjectsCheckConflictsObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    const types = this.getUniqueObjectTypes(objects);
    const args = { objects, options };
    await this.ensureAuthorized(types, 'bulk_create', options.namespace, args, 'checkConflicts');

    const response = await this.baseClient.checkConflicts(objects, options);
    return response;
  }

  public async bulkCreate<T = unknown>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options: SavedObjectsBaseOptions = {}
  ) {
    await this.ensureAuthorized(
      this.getUniqueObjectTypes(objects),
      'bulk_create',
      options.namespace,
      { objects, options }
    );

    const response = await this.baseClient.bulkCreate(objects, options);
    return await this.redactSavedObjectsNamespaces(response);
  }

  public async delete(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    await this.ensureAuthorized(type, 'delete', options.namespace, { type, id, options });

    return await this.baseClient.delete(type, id, options);
  }

  public async find<T = unknown>(options: SavedObjectsFindOptions) {
    if (
      this.getSpacesService() == null &&
      Array.isArray(options.namespaces) &&
      options.namespaces.length > 0
    ) {
      throw this.errors.createBadRequestError(
        `_find across namespaces is not permitted when the Spaces plugin is disabled.`
      );
    }
    await this.ensureAuthorized(options.type, 'find', options.namespaces, { options });

    const response = await this.baseClient.find<T>(options);
    return await this.redactSavedObjectsNamespaces(response);
  }

  public async bulkGet<T = unknown>(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    await this.ensureAuthorized(this.getUniqueObjectTypes(objects), 'bulk_get', options.namespace, {
      objects,
      options,
    });

    const response = await this.baseClient.bulkGet<T>(objects, options);
    return await this.redactSavedObjectsNamespaces(response);
  }

  public async get<T = unknown>(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    await this.ensureAuthorized(type, 'get', options.namespace, { type, id, options });

    const savedObject = await this.baseClient.get<T>(type, id, options);
    return await this.redactSavedObjectNamespaces(savedObject);
  }

  public async update<T = unknown>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions = {}
  ) {
    const args = { type, id, attributes, options };
    await this.ensureAuthorized(type, 'update', options.namespace, args);

    const savedObject = await this.baseClient.update(type, id, attributes, options);
    return await this.redactSavedObjectNamespaces(savedObject);
  }

  public async addToNamespaces(
    type: string,
    id: string,
    namespaces: string[],
    options: SavedObjectsAddToNamespacesOptions = {}
  ) {
    const args = { type, id, namespaces, options };
    const { namespace } = options;
    // To share an object, the user must have the "create" permission in each of the destination namespaces.
    await this.ensureAuthorized(type, 'create', namespaces, args, 'addToNamespacesCreate');

    // To share an object, the user must also have the "update" permission in one or more of the source namespaces. Because the
    // `addToNamespaces` operation is scoped to the current namespace, we can just check if the user has the "update" permission in the
    // current namespace. If the user has permission, but the saved object doesn't exist in this namespace, the base client operation will
    // result in a 404 error.
    await this.ensureAuthorized(type, 'update', namespace, args, 'addToNamespacesUpdate');

    const result = await this.baseClient.addToNamespaces(type, id, namespaces, options);
    return await this.redactSavedObjectNamespaces(result);
  }

  public async deleteFromNamespaces(
    type: string,
    id: string,
    namespaces: string[],
    options: SavedObjectsDeleteFromNamespacesOptions = {}
  ) {
    const args = { type, id, namespaces, options };
    // To un-share an object, the user must have the "delete" permission in each of the target namespaces.
    await this.ensureAuthorized(type, 'delete', namespaces, args, 'deleteFromNamespaces');

    const result = await this.baseClient.deleteFromNamespaces(type, id, namespaces, options);
    return await this.redactSavedObjectNamespaces(result);
  }

  public async bulkUpdate<T = unknown>(
    objects: Array<SavedObjectsBulkUpdateObject<T>> = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    await this.ensureAuthorized(
      this.getUniqueObjectTypes(objects),
      'bulk_update',
      options && options.namespace,
      { objects, options }
    );

    const response = await this.baseClient.bulkUpdate<T>(objects, options);
    return await this.redactSavedObjectsNamespaces(response);
  }

  private async checkPrivileges(
    actions: string | string[],
    namespaceOrNamespaces?: string | string[]
  ) {
    try {
      return await this.checkSavedObjectsPrivilegesAsCurrentUser(actions, namespaceOrNamespaces);
    } catch (error) {
      throw this.errors.decorateGeneralError(error, error.body && error.body.reason);
    }
  }

  private async ensureAuthorized(
    typeOrTypes: string | string[],
    action: string,
    namespaceOrNamespaces?: string | string[],
    args?: Record<string, unknown>,
    auditAction: string = action,
    requiresAll = true
  ) {
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const actionsToTypesMap = new Map(
      types.map((type) => [this.actions.savedObject.get(type, action), type])
    );
    const actions = Array.from(actionsToTypesMap.keys());
    const result = await this.checkPrivileges(actions, namespaceOrNamespaces);

    const { hasAllRequested, username, privileges } = result;
    const spaceIds = uniq(
      privileges.map(({ resource }) => resource).filter((x) => x !== undefined)
    ).sort() as string[];

    const isAuthorized =
      (requiresAll && hasAllRequested) ||
      (!requiresAll && privileges.some(({ authorized }) => authorized));
    if (isAuthorized) {
      this.auditLogger.savedObjectsAuthorizationSuccess(
        username,
        auditAction,
        types,
        spaceIds,
        args
      );
    } else {
      const missingPrivileges = this.getMissingPrivileges(privileges);
      this.auditLogger.savedObjectsAuthorizationFailure(
        username,
        auditAction,
        types,
        spaceIds,
        missingPrivileges,
        args
      );
      const targetTypes = uniq(
        missingPrivileges.map(({ privilege }) => actionsToTypesMap.get(privilege)).sort()
      ).join(',');
      const msg = `Unable to ${action} ${targetTypes}`;
      throw this.errors.decorateForbiddenError(new Error(msg));
    }
  }

  private getMissingPrivileges(privileges: CheckPrivilegesResponse['privileges']) {
    return privileges
      .filter(({ authorized }) => !authorized)
      .map(({ resource, privilege }) => ({ spaceId: resource, privilege }));
  }

  private getUniqueObjectTypes(objects: Array<{ type: string }>) {
    return uniq(objects.map((o) => o.type));
  }

  private async getNamespacesPrivilegeMap(namespaces: string[]) {
    const action = this.actions.login;
    const checkPrivilegesResult = await this.checkPrivileges(action, namespaces);
    // check if the user can log into each namespace
    const map = checkPrivilegesResult.privileges.reduce(
      (acc: Record<string, boolean>, { resource, authorized }) => {
        // there should never be a case where more than one privilege is returned for a given space
        // if there is, fail-safe (authorized + unauthorized = unauthorized)
        if (resource && (!authorized || !acc.hasOwnProperty(resource))) {
          acc[resource] = authorized;
        }
        return acc;
      },
      {}
    );
    return map;
  }

  private redactAndSortNamespaces(spaceIds: string[], privilegeMap: Record<string, boolean>) {
    const comparator = (a: string, b: string) => {
      const _a = a.toLowerCase();
      const _b = b.toLowerCase();
      if (_a === '?') {
        return 1;
      } else if (_a < _b) {
        return -1;
      } else if (_a > _b) {
        return 1;
      }
      return 0;
    };
    return spaceIds.map((spaceId) => (privilegeMap[spaceId] ? spaceId : '?')).sort(comparator);
  }

  private async redactSavedObjectNamespaces<T extends SavedObjectNamespaces>(
    savedObject: T
  ): Promise<T> {
    if (
      this.getSpacesService() === undefined ||
      savedObject.namespaces == null ||
      savedObject.namespaces.length === 0
    ) {
      return savedObject;
    }

    const privilegeMap = await this.getNamespacesPrivilegeMap(savedObject.namespaces);

    return {
      ...savedObject,
      namespaces: this.redactAndSortNamespaces(savedObject.namespaces, privilegeMap),
    };
  }

  private async redactSavedObjectsNamespaces<T extends SavedObjectsNamespaces>(
    response: T
  ): Promise<T> {
    if (this.getSpacesService() === undefined) {
      return response;
    }
    const { saved_objects: savedObjects } = response;
    const namespaces = uniq(savedObjects.flatMap((savedObject) => savedObject.namespaces || []));
    if (namespaces.length === 0) {
      return response;
    }

    const privilegeMap = await this.getNamespacesPrivilegeMap(namespaces);

    return {
      ...response,
      saved_objects: savedObjects.map((savedObject) => ({
        ...savedObject,
        namespaces:
          savedObject.namespaces &&
          this.redactAndSortNamespaces(savedObject.namespaces, privilegeMap),
      })),
    };
  }
}
