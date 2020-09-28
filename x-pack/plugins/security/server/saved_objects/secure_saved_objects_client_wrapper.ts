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
  SavedObjectsUtils,
} from '../../../../../src/core/server';
import { SecurityAuditLogger } from '../audit';
import { Actions, CheckSavedObjectsPrivileges } from '../authorization';
import { CheckPrivilegesResponse } from '../authorization/types';
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

interface EnsureAuthorizedOptions {
  args?: Record<string, unknown>;
  auditAction?: string;
  requireFullAuthorization?: boolean;
}

interface EnsureAuthorizedResult {
  status: 'fully_authorized' | 'partially_authorized' | 'unauthorized';
  typeMap: Map<string, EnsureAuthorizedTypeResult>;
}
interface EnsureAuthorizedTypeResult {
  authorizedSpaces: string[];
  isGloballyAuthorized?: boolean;
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
    const args = { type, attributes, options };
    await this.ensureAuthorized(type, 'create', options.namespace, { args });

    const savedObject = await this.baseClient.create(type, attributes, options);
    return await this.redactSavedObjectNamespaces(savedObject);
  }

  public async checkConflicts(
    objects: SavedObjectsCheckConflictsObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    const args = { objects, options };
    const types = this.getUniqueObjectTypes(objects);
    await this.ensureAuthorized(types, 'bulk_create', options.namespace, {
      args,
      auditAction: 'checkConflicts',
    });

    const response = await this.baseClient.checkConflicts(objects, options);
    return response;
  }

  public async bulkCreate<T = unknown>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options: SavedObjectsBaseOptions = {}
  ) {
    const args = { objects, options };
    await this.ensureAuthorized(
      this.getUniqueObjectTypes(objects),
      'bulk_create',
      options.namespace,
      { args }
    );

    const response = await this.baseClient.bulkCreate(objects, options);
    return await this.redactSavedObjectsNamespaces(response);
  }

  public async delete(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    const args = { type, id, options };
    await this.ensureAuthorized(type, 'delete', options.namespace, { args });

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
    const args = { options };
    const { status, typeMap } = await this.ensureAuthorized(
      options.type,
      'find',
      options.namespaces,
      { args, requireFullAuthorization: false }
    );

    if (status === 'unauthorized') {
      // return empty response
      return SavedObjectsUtils.createEmptyFindResponse<T>(options);
    }

    const typeToNamespacesMap = Array.from(typeMap).reduce<Map<string, string[] | undefined>>(
      (acc, [type, { authorizedSpaces, isGloballyAuthorized }]) =>
        isGloballyAuthorized ? acc.set(type, options.namespaces) : acc.set(type, authorizedSpaces),
      new Map()
    );
    const response = await this.baseClient.find<T>({
      ...options,
      typeToNamespacesMap: undefined, // if the user is fully authorized, use `undefined` as the typeToNamespacesMap to prevent privilege escalation
      ...(status === 'partially_authorized' && { typeToNamespacesMap, type: '', namespaces: [] }), // the repository requires that `type` and `namespaces` must be empty if `typeToNamespacesMap` is defined
    });
    return await this.redactSavedObjectsNamespaces(response);
  }

  public async bulkGet<T = unknown>(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    const args = { objects, options };
    await this.ensureAuthorized(this.getUniqueObjectTypes(objects), 'bulk_get', options.namespace, {
      args,
    });

    const response = await this.baseClient.bulkGet<T>(objects, options);
    return await this.redactSavedObjectsNamespaces(response);
  }

  public async get<T = unknown>(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    const args = { type, id, options };
    await this.ensureAuthorized(type, 'get', options.namespace, { args });

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
    await this.ensureAuthorized(type, 'update', options.namespace, { args });

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
    await this.ensureAuthorized(type, 'create', namespaces, {
      args,
      auditAction: 'addToNamespacesCreate',
    });

    // To share an object, the user must also have the "update" permission in one or more of the source namespaces. Because the
    // `addToNamespaces` operation is scoped to the current namespace, we can just check if the user has the "update" permission in the
    // current namespace. If the user has permission, but the saved object doesn't exist in this namespace, the base client operation will
    // result in a 404 error.
    await this.ensureAuthorized(type, 'update', namespace, {
      args,
      auditAction: 'addToNamespacesUpdate',
    });

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
    await this.ensureAuthorized(type, 'delete', namespaces, {
      args,
      auditAction: 'deleteFromNamespaces',
    });

    const result = await this.baseClient.deleteFromNamespaces(type, id, namespaces, options);
    return await this.redactSavedObjectNamespaces(result);
  }

  public async bulkUpdate<T = unknown>(
    objects: Array<SavedObjectsBulkUpdateObject<T>> = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    const objectNamespaces = objects
      // The repository treats an `undefined` object namespace is treated as the absence of a namespace, falling back to options.namespace;
      // in this case, filter it out here so we don't accidentally check for privileges in the Default space when we shouldn't be doing so.
      .filter(({ namespace }) => namespace !== undefined)
      .map(({ namespace }) => namespace!);
    const namespaces = [options?.namespace, ...objectNamespaces];
    const args = { objects, options };
    await this.ensureAuthorized(this.getUniqueObjectTypes(objects), 'bulk_update', namespaces, {
      args,
    });

    const response = await this.baseClient.bulkUpdate<T>(objects, options);
    return await this.redactSavedObjectsNamespaces(response);
  }

  private async checkPrivileges(
    actions: string | string[],
    namespaceOrNamespaces?: string | Array<undefined | string>
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
    namespaceOrNamespaces: undefined | string | Array<undefined | string>,
    options: EnsureAuthorizedOptions = {}
  ): Promise<EnsureAuthorizedResult> {
    const { args, auditAction = action, requireFullAuthorization = true } = options;
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const actionsToTypesMap = new Map(
      types.map((type) => [this.actions.savedObject.get(type, action), type])
    );
    const actions = Array.from(actionsToTypesMap.keys());
    const result = await this.checkPrivileges(actions, namespaceOrNamespaces);

    const { hasAllRequested, username, privileges } = result;
    const spaceIds = uniq(
      privileges.kibana.map(({ resource }) => resource).filter((x) => x !== undefined)
    ).sort() as string[];

    const missingPrivileges = this.getMissingPrivileges(privileges);
    const typeMap = privileges.kibana.reduce<Map<string, EnsureAuthorizedTypeResult>>(
      (acc, { resource, privilege, authorized }) => {
        if (!authorized) {
          return acc;
        }
        const type = actionsToTypesMap.get(privilege)!; // always defined
        const value = acc.get(type) ?? { authorizedSpaces: [] };
        if (resource === undefined) {
          return acc.set(type, { ...value, isGloballyAuthorized: true });
        }
        const authorizedSpaces = value.authorizedSpaces.concat(resource);
        return acc.set(type, { ...value, authorizedSpaces });
      },
      new Map()
    );

    const logAuthorizationFailure = () => {
      this.auditLogger.savedObjectsAuthorizationFailure(
        username,
        auditAction,
        types,
        spaceIds,
        missingPrivileges,
        args
      );
    };
    const logAuthorizationSuccess = (typeArray: string[], spaceIdArray: string[]) => {
      this.auditLogger.savedObjectsAuthorizationSuccess(
        username,
        auditAction,
        typeArray,
        spaceIdArray,
        args
      );
    };

    if (hasAllRequested) {
      logAuthorizationSuccess(types, spaceIds);
      return { typeMap, status: 'fully_authorized' };
    } else if (!requireFullAuthorization) {
      const isPartiallyAuthorized = privileges.kibana.some(({ authorized }) => authorized);
      if (isPartiallyAuthorized) {
        for (const [type, { isGloballyAuthorized, authorizedSpaces }] of typeMap.entries()) {
          // generate an individual audit record for each authorized type
          logAuthorizationSuccess([type], isGloballyAuthorized ? spaceIds : authorizedSpaces);
        }
        return { typeMap, status: 'partially_authorized' };
      } else {
        logAuthorizationFailure();
        return { typeMap, status: 'unauthorized' };
      }
    } else {
      logAuthorizationFailure();
      const targetTypes = uniq(
        missingPrivileges.map(({ privilege }) => actionsToTypesMap.get(privilege)).sort()
      ).join(',');
      const msg = `Unable to ${action} ${targetTypes}`;
      throw this.errors.decorateForbiddenError(new Error(msg));
    }
  }

  private getMissingPrivileges(privileges: CheckPrivilegesResponse['privileges']) {
    return privileges.kibana
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
    const map = checkPrivilegesResult.privileges.kibana.reduce(
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
    return spaceIds.map((x) => (privilegeMap[x] ? x : '?')).sort(namespaceComparator);
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

/**
 * Returns all unique elements of an array.
 */
function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set<T>(arr));
}

/**
 * Utility function to sort potentially redacted namespaces.
 * Sorts in a case-insensitive manner, and ensures that redacted namespaces ('?') always show up at the end of the array.
 */
function namespaceComparator(a: string, b: string) {
  const A = a.toUpperCase();
  const B = b.toUpperCase();
  if (A === '?' && B !== '?') {
    return 1;
  } else if (A !== '?' && B === '?') {
    return -1;
  }
  return A > B ? 1 : A < B ? -1 : 0;
}
