/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import {
  SavedObjectsAddToNamespacesOptions,
  SavedObjectsBaseOptions,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsCheckConflictsObject,
  SavedObjectsClientContract,
  SavedObjectsCreateOptions,
  SavedObjectsDeleteFromNamespacesOptions,
  SavedObjectsFindOptions,
  SavedObjectsRemoveReferencesToOptions,
  SavedObjectsUpdateOptions,
  SavedObjectsUtils,
} from '../../../../../src/core/server';
import { ALL_SPACES_ID, UNKNOWN_SPACE } from '../../common/constants';
import {
  AuditLogger,
  EventOutcome,
  SavedObjectAction,
  savedObjectEvent,
  SecurityAuditLogger,
} from '../audit';
import { Actions, CheckSavedObjectsPrivileges } from '../authorization';
import { CheckPrivilegesResponse } from '../authorization/types';
import { SpacesService } from '../plugin';

interface SecureSavedObjectsClientWrapperOptions {
  actions: Actions;
  legacyAuditLogger: SecurityAuditLogger;
  auditLogger: AuditLogger;
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
  private readonly legacyAuditLogger: PublicMethodsOf<SecurityAuditLogger>;
  private readonly auditLogger: AuditLogger;
  private readonly baseClient: SavedObjectsClientContract;
  private readonly checkSavedObjectsPrivilegesAsCurrentUser: CheckSavedObjectsPrivileges;
  private getSpacesService: () => SpacesService | undefined;
  public readonly errors: SavedObjectsClientContract['errors'];

  constructor({
    actions,
    legacyAuditLogger,
    auditLogger,
    baseClient,
    checkSavedObjectsPrivilegesAsCurrentUser,
    errors,
    getSpacesService,
  }: SecureSavedObjectsClientWrapperOptions) {
    this.errors = errors;
    this.actions = actions;
    this.legacyAuditLogger = legacyAuditLogger;
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
    const optionsWithId = { ...options, id: options.id ?? SavedObjectsUtils.generateId() };
    const namespaces = [optionsWithId.namespace, ...(optionsWithId.initialNamespaces || [])];
    try {
      const args = { type, attributes, options: optionsWithId };
      await this.ensureAuthorized(type, 'create', namespaces, { args });
    } catch (error) {
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.CREATE,
          savedObject: { type, id: optionsWithId.id },
          error,
        })
      );
      throw error;
    }
    this.auditLogger.log(
      savedObjectEvent({
        action: SavedObjectAction.CREATE,
        outcome: EventOutcome.UNKNOWN,
        savedObject: { type, id: optionsWithId.id },
      })
    );

    const savedObject = await this.baseClient.create(type, attributes, optionsWithId);
    return await this.redactSavedObjectNamespaces(savedObject, namespaces);
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
    const objectsWithId = objects.map((obj) => ({
      ...obj,
      id: obj.id ?? SavedObjectsUtils.generateId(),
    }));
    const namespaces = objectsWithId.reduce(
      (acc, { initialNamespaces = [] }) => acc.concat(initialNamespaces),
      [options.namespace]
    );
    try {
      const args = { objects: objectsWithId, options };
      await this.ensureAuthorized(
        this.getUniqueObjectTypes(objectsWithId),
        'bulk_create',
        namespaces,
        {
          args,
        }
      );
    } catch (error) {
      objectsWithId.forEach(({ type, id }) =>
        this.auditLogger.log(
          savedObjectEvent({
            action: SavedObjectAction.CREATE,
            savedObject: { type, id },
            error,
          })
        )
      );
      throw error;
    }
    objectsWithId.forEach(({ type, id }) =>
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.CREATE,
          outcome: EventOutcome.UNKNOWN,
          savedObject: { type, id },
        })
      )
    );

    const response = await this.baseClient.bulkCreate(objectsWithId, options);
    return await this.redactSavedObjectsNamespaces(response, namespaces);
  }

  public async delete(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    try {
      const args = { type, id, options };
      await this.ensureAuthorized(type, 'delete', options.namespace, { args });
    } catch (error) {
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.DELETE,
          savedObject: { type, id },
          error,
        })
      );
      throw error;
    }
    this.auditLogger.log(
      savedObjectEvent({
        action: SavedObjectAction.DELETE,
        outcome: EventOutcome.UNKNOWN,
        savedObject: { type, id },
      })
    );

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
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.FIND,
          error: new Error(status),
        })
      );
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

    response.saved_objects.forEach(({ type, id }) =>
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.FIND,
          savedObject: { type, id },
        })
      )
    );

    return await this.redactSavedObjectsNamespaces(response, options.namespaces ?? [undefined]);
  }

  public async bulkGet<T = unknown>(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    try {
      const args = { objects, options };
      await this.ensureAuthorized(
        this.getUniqueObjectTypes(objects),
        'bulk_get',
        options.namespace,
        {
          args,
        }
      );
    } catch (error) {
      objects.forEach(({ type, id }) =>
        this.auditLogger.log(
          savedObjectEvent({
            action: SavedObjectAction.GET,
            savedObject: { type, id },
            error,
          })
        )
      );
      throw error;
    }

    const response = await this.baseClient.bulkGet<T>(objects, options);

    response.saved_objects.forEach(({ error, type, id }) => {
      if (!error) {
        this.auditLogger.log(
          savedObjectEvent({
            action: SavedObjectAction.GET,
            savedObject: { type, id },
          })
        );
      }
    });

    return await this.redactSavedObjectsNamespaces(response, [options.namespace]);
  }

  public async get<T = unknown>(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    try {
      const args = { type, id, options };
      await this.ensureAuthorized(type, 'get', options.namespace, { args });
    } catch (error) {
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.GET,
          savedObject: { type, id },
          error,
        })
      );
      throw error;
    }

    const savedObject = await this.baseClient.get<T>(type, id, options);

    this.auditLogger.log(
      savedObjectEvent({
        action: SavedObjectAction.GET,
        savedObject: { type, id },
      })
    );

    return await this.redactSavedObjectNamespaces(savedObject, [options.namespace]);
  }

  public async update<T = unknown>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions = {}
  ) {
    try {
      const args = { type, id, attributes, options };
      await this.ensureAuthorized(type, 'update', options.namespace, { args });
    } catch (error) {
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.UPDATE,
          savedObject: { type, id },
          error,
        })
      );
      throw error;
    }
    this.auditLogger.log(
      savedObjectEvent({
        action: SavedObjectAction.UPDATE,
        outcome: EventOutcome.UNKNOWN,
        savedObject: { type, id },
      })
    );

    const savedObject = await this.baseClient.update(type, id, attributes, options);
    return await this.redactSavedObjectNamespaces(savedObject, [options.namespace]);
  }

  public async addToNamespaces(
    type: string,
    id: string,
    namespaces: string[],
    options: SavedObjectsAddToNamespacesOptions = {}
  ) {
    const { namespace } = options;
    try {
      const args = { type, id, namespaces, options };
      // To share an object, the user must have the "share_to_space" permission in each of the destination namespaces.
      await this.ensureAuthorized(type, 'share_to_space', namespaces, {
        args,
        auditAction: 'addToNamespacesCreate',
      });

      // To share an object, the user must also have the "share_to_space" permission in one or more of the source namespaces. Because the
      // `addToNamespaces` operation is scoped to the current namespace, we can just check if the user has the "share_to_space" permission in
      // the current namespace. If the user has permission, but the saved object doesn't exist in this namespace, the base client operation
      // will result in a 404 error.
      await this.ensureAuthorized(type, 'share_to_space', namespace, {
        args,
        auditAction: 'addToNamespacesUpdate',
      });
    } catch (error) {
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.ADD_TO_SPACES,
          savedObject: { type, id },
          addToSpaces: namespaces,
          error,
        })
      );
      throw error;
    }
    this.auditLogger.log(
      savedObjectEvent({
        action: SavedObjectAction.ADD_TO_SPACES,
        outcome: EventOutcome.UNKNOWN,
        savedObject: { type, id },
        addToSpaces: namespaces,
      })
    );

    const response = await this.baseClient.addToNamespaces(type, id, namespaces, options);
    return await this.redactSavedObjectNamespaces(response, [namespace, ...namespaces]);
  }

  public async deleteFromNamespaces(
    type: string,
    id: string,
    namespaces: string[],
    options: SavedObjectsDeleteFromNamespacesOptions = {}
  ) {
    try {
      const args = { type, id, namespaces, options };
      // To un-share an object, the user must have the "share_to_space" permission in each of the target namespaces.
      await this.ensureAuthorized(type, 'share_to_space', namespaces, {
        args,
        auditAction: 'deleteFromNamespaces',
      });
    } catch (error) {
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.DELETE_FROM_SPACES,
          savedObject: { type, id },
          deleteFromSpaces: namespaces,
          error,
        })
      );
      throw error;
    }
    this.auditLogger.log(
      savedObjectEvent({
        action: SavedObjectAction.DELETE_FROM_SPACES,
        outcome: EventOutcome.UNKNOWN,
        savedObject: { type, id },
        deleteFromSpaces: namespaces,
      })
    );

    const response = await this.baseClient.deleteFromNamespaces(type, id, namespaces, options);
    return await this.redactSavedObjectNamespaces(response, namespaces);
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
    try {
      const args = { objects, options };
      await this.ensureAuthorized(this.getUniqueObjectTypes(objects), 'bulk_update', namespaces, {
        args,
      });
    } catch (error) {
      objects.forEach(({ type, id }) =>
        this.auditLogger.log(
          savedObjectEvent({
            action: SavedObjectAction.UPDATE,
            savedObject: { type, id },
            error,
          })
        )
      );
      throw error;
    }
    objects.forEach(({ type, id }) =>
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.UPDATE,
          outcome: EventOutcome.UNKNOWN,
          savedObject: { type, id },
        })
      )
    );

    const response = await this.baseClient.bulkUpdate<T>(objects, options);
    return await this.redactSavedObjectsNamespaces(response, namespaces);
  }

  public async removeReferencesTo(
    type: string,
    id: string,
    options: SavedObjectsRemoveReferencesToOptions = {}
  ) {
    try {
      const args = { type, id, options };
      await this.ensureAuthorized(type, 'delete', options.namespace, {
        args,
        auditAction: 'removeReferences',
      });
    } catch (error) {
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.REMOVE_REFERENCES,
          savedObject: { type, id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger.log(
      savedObjectEvent({
        action: SavedObjectAction.REMOVE_REFERENCES,
        savedObject: { type, id },
        outcome: EventOutcome.UNKNOWN,
      })
    );

    return await this.baseClient.removeReferencesTo(type, id, options);
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
      this.legacyAuditLogger.savedObjectsAuthorizationFailure(
        username,
        auditAction,
        types,
        spaceIds,
        missingPrivileges,
        args
      );
    };
    const logAuthorizationSuccess = (typeArray: string[], spaceIdArray: string[]) => {
      this.legacyAuditLogger.savedObjectsAuthorizationSuccess(
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

  private async getNamespacesPrivilegeMap(
    namespaces: string[],
    previouslyAuthorizedSpaceIds: string[]
  ) {
    const namespacesToCheck = namespaces.filter(
      (namespace) => !previouslyAuthorizedSpaceIds.includes(namespace)
    );
    const initialPrivilegeMap = previouslyAuthorizedSpaceIds.reduce(
      (acc, spaceId) => acc.set(spaceId, true),
      new Map<string, boolean>()
    );
    if (namespacesToCheck.length === 0) {
      return initialPrivilegeMap;
    }
    const action = this.actions.login;
    const checkPrivilegesResult = await this.checkPrivileges(action, namespacesToCheck);
    // check if the user can log into each namespace
    const map = checkPrivilegesResult.privileges.kibana.reduce((acc, { resource, authorized }) => {
      // there should never be a case where more than one privilege is returned for a given space
      // if there is, fail-safe (authorized + unauthorized = unauthorized)
      if (resource && (!authorized || !acc.has(resource))) {
        acc.set(resource, authorized);
      }
      return acc;
    }, initialPrivilegeMap);
    return map;
  }

  private redactAndSortNamespaces(spaceIds: string[], privilegeMap: Map<string, boolean>) {
    return spaceIds
      .map((x) => (x === ALL_SPACES_ID || privilegeMap.get(x) ? x : UNKNOWN_SPACE))
      .sort(namespaceComparator);
  }

  private async redactSavedObjectNamespaces<T extends SavedObjectNamespaces>(
    savedObject: T,
    previouslyAuthorizedNamespaces: Array<string | undefined>
  ): Promise<T> {
    if (
      this.getSpacesService() === undefined ||
      savedObject.namespaces == null ||
      savedObject.namespaces.length === 0
    ) {
      return savedObject;
    }

    const previouslyAuthorizedSpaceIds = previouslyAuthorizedNamespaces.map((x) =>
      this.getSpacesService()!.namespaceToSpaceId(x)
    );
    // all users can see the "all spaces" ID, and we don't need to recheck authorization for any namespaces that we just checked earlier
    const namespaces = savedObject.namespaces.filter(
      (x) => x !== ALL_SPACES_ID && !previouslyAuthorizedSpaceIds.includes(x)
    );

    const privilegeMap = await this.getNamespacesPrivilegeMap(
      namespaces,
      previouslyAuthorizedSpaceIds
    );

    return {
      ...savedObject,
      namespaces: this.redactAndSortNamespaces(savedObject.namespaces, privilegeMap),
    };
  }

  private async redactSavedObjectsNamespaces<T extends SavedObjectsNamespaces>(
    response: T,
    previouslyAuthorizedNamespaces: Array<string | undefined>
  ): Promise<T> {
    if (this.getSpacesService() === undefined) {
      return response;
    }

    const previouslyAuthorizedSpaceIds = previouslyAuthorizedNamespaces.map((x) =>
      this.getSpacesService()!.namespaceToSpaceId(x)
    );
    const { saved_objects: savedObjects } = response;
    // all users can see the "all spaces" ID, and we don't need to recheck authorization for any namespaces that we just checked earlier
    const namespaces = uniq(
      savedObjects.flatMap((savedObject) => savedObject.namespaces || [])
    ).filter((x) => x !== ALL_SPACES_ID && !previouslyAuthorizedSpaceIds.includes(x));

    const privilegeMap = await this.getNamespacesPrivilegeMap(
      namespaces,
      previouslyAuthorizedSpaceIds
    );

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
  if (A === UNKNOWN_SPACE && B !== UNKNOWN_SPACE) {
    return 1;
  } else if (A !== UNKNOWN_SPACE && B === UNKNOWN_SPACE) {
    return -1;
  }
  return A > B ? 1 : A < B ? -1 : 0;
}
