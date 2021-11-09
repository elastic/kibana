/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectReferenceWithContext,
  SavedObjectsBaseOptions,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkResolveObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsCheckConflictsObject,
  SavedObjectsClientContract,
  SavedObjectsClosePointInTimeOptions,
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
  SavedObjectsCreateOptions,
  SavedObjectsCreatePointInTimeFinderDependencies,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsFindOptions,
  SavedObjectsOpenPointInTimeOptions,
  SavedObjectsRemoveReferencesToOptions,
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesOptions,
  SavedObjectsUpdateOptions,
} from 'src/core/server';

import { SavedObjectsErrorHelpers, SavedObjectsUtils } from '../../../../../src/core/server';
import { ALL_SPACES_ID, UNKNOWN_SPACE } from '../../common/constants';
import type { AuditLogger } from '../audit';
import { SavedObjectAction, savedObjectEvent } from '../audit';
import type { Actions, CheckSavedObjectsPrivileges } from '../authorization';
import type { CheckPrivilegesResponse } from '../authorization/types';
import type { SpacesService } from '../plugin';
import type {
  EnsureAuthorizedDependencies,
  EnsureAuthorizedOptions,
  EnsureAuthorizedResult,
} from './ensure_authorized';
import {
  ensureAuthorized,
  getEnsureAuthorizedActionResult,
  isAuthorizedForObjectInAllSpaces,
} from './ensure_authorized';

interface SecureSavedObjectsClientWrapperOptions {
  actions: Actions;
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

interface LegacyEnsureAuthorizedOptions {
  args?: Record<string, unknown>;
  auditAction?: string;
  requireFullAuthorization?: boolean;
}

interface LegacyEnsureAuthorizedResult {
  status: 'fully_authorized' | 'partially_authorized' | 'unauthorized';
  typeMap: Map<string, LegacyEnsureAuthorizedTypeResult>;
}

interface LegacyEnsureAuthorizedTypeResult {
  authorizedSpaces: string[];
  isGloballyAuthorized?: boolean;
}

export class SecureSavedObjectsClientWrapper implements SavedObjectsClientContract {
  private readonly actions: Actions;
  private readonly auditLogger: AuditLogger;
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
    const optionsWithId = { ...options, id: options.id ?? SavedObjectsUtils.generateId() };
    const namespaces = [optionsWithId.namespace, ...(optionsWithId.initialNamespaces || [])];
    try {
      const args = { type, attributes, options: optionsWithId };
      await this.legacyEnsureAuthorized(type, 'create', namespaces, { args });
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
        outcome: 'unknown',
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
    await this.legacyEnsureAuthorized(types, 'bulk_create', options.namespace, {
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
      await this.legacyEnsureAuthorized(
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
          outcome: 'unknown',
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
      await this.legacyEnsureAuthorized(type, 'delete', options.namespace, { args });
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
        outcome: 'unknown',
        savedObject: { type, id },
      })
    );

    return await this.baseClient.delete(type, id, options);
  }

  public async find<T = unknown, A = unknown>(options: SavedObjectsFindOptions) {
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
    const { status, typeMap } = await this.legacyEnsureAuthorized(
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
      return SavedObjectsUtils.createEmptyFindResponse<T, A>(options);
    }

    const typeToNamespacesMap = Array.from(typeMap).reduce<Map<string, string[] | undefined>>(
      (acc, [type, { authorizedSpaces, isGloballyAuthorized }]) =>
        isGloballyAuthorized ? acc.set(type, options.namespaces) : acc.set(type, authorizedSpaces),
      new Map()
    );

    const response = await this.baseClient.find<T, A>({
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
      const namespaces = objects.reduce(
        (acc, { namespaces: objNamespaces = [] }) => acc.concat(objNamespaces),
        [options.namespace]
      );
      const args = { objects, options };
      await this.legacyEnsureAuthorized(
        this.getUniqueObjectTypes(objects),
        'bulk_get',
        namespaces,
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
      await this.legacyEnsureAuthorized(type, 'get', options.namespace, { args });
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

  public async bulkResolve<T = unknown>(
    objects: SavedObjectsBulkResolveObject[],
    options: SavedObjectsBaseOptions = {}
  ) {
    try {
      const args = { objects, options };
      await this.legacyEnsureAuthorized(
        this.getUniqueObjectTypes(objects),
        'bulk_get',
        options.namespace,
        { args, auditAction: 'bulk_resolve' }
      );
    } catch (error) {
      objects.forEach(({ type, id }) =>
        this.auditLogger.log(
          savedObjectEvent({
            action: SavedObjectAction.RESOLVE,
            savedObject: { type, id },
            error,
          })
        )
      );
      throw error;
    }

    const response = await this.baseClient.bulkResolve<T>(objects, options);

    response.resolved_objects.forEach(({ saved_object: { error, type, id } }) => {
      if (!error) {
        this.auditLogger.log(
          savedObjectEvent({
            action: SavedObjectAction.RESOLVE,
            savedObject: { type, id },
          })
        );
      }
    });

    // the generic redactSavedObjectsNamespaces function cannot be used here due to the nested structure of the
    // resolved objects, so we handle redaction in a bespoke manner for bulkResolve

    if (this.getSpacesService() === undefined) {
      return response;
    }

    const previouslyAuthorizedSpaceIds = [
      this.getSpacesService()!.namespaceToSpaceId(options.namespace),
    ];
    // all users can see the "all spaces" ID, and we don't need to recheck authorization for any namespaces that we just checked earlier
    const namespaces = uniq(
      response.resolved_objects.flatMap((resolved) => resolved.saved_object.namespaces || [])
    ).filter((x) => x !== ALL_SPACES_ID && !previouslyAuthorizedSpaceIds.includes(x));

    const privilegeMap = await this.getNamespacesPrivilegeMap(
      namespaces,
      previouslyAuthorizedSpaceIds
    );

    return {
      ...response,
      resolved_objects: response.resolved_objects.map((resolved) => ({
        ...resolved,
        saved_object: {
          ...resolved.saved_object,
          namespaces:
            resolved.saved_object.namespaces &&
            this.redactAndSortNamespaces(resolved.saved_object.namespaces, privilegeMap),
        },
      })),
    };
  }

  public async resolve<T = unknown>(
    type: string,
    id: string,
    options: SavedObjectsBaseOptions = {}
  ) {
    try {
      const args = { type, id, options };
      await this.legacyEnsureAuthorized(type, 'get', options.namespace, {
        args,
        auditAction: 'resolve',
      });
    } catch (error) {
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.RESOLVE,
          savedObject: { type, id },
          error,
        })
      );
      throw error;
    }

    const resolveResult = await this.baseClient.resolve<T>(type, id, options);

    this.auditLogger.log(
      savedObjectEvent({
        action: SavedObjectAction.RESOLVE,
        savedObject: { type, id: resolveResult.saved_object.id },
      })
    );

    return {
      ...resolveResult,
      saved_object: await this.redactSavedObjectNamespaces(resolveResult.saved_object, [
        options.namespace,
      ]),
    };
  }

  public async update<T = unknown>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions = {}
  ) {
    try {
      const args = { type, id, attributes, options };
      await this.legacyEnsureAuthorized(type, 'update', options.namespace, { args });
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
        outcome: 'unknown',
        savedObject: { type, id },
      })
    );

    const savedObject = await this.baseClient.update(type, id, attributes, options);
    return await this.redactSavedObjectNamespaces(savedObject, [options.namespace]);
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
      await this.legacyEnsureAuthorized(
        this.getUniqueObjectTypes(objects),
        'bulk_update',
        namespaces,
        {
          args,
        }
      );
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
          outcome: 'unknown',
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
      await this.legacyEnsureAuthorized(type, 'delete', options.namespace, {
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
        outcome: 'unknown',
      })
    );

    return await this.baseClient.removeReferencesTo(type, id, options);
  }

  public async openPointInTimeForType(
    type: string | string[],
    options: SavedObjectsOpenPointInTimeOptions
  ) {
    const args = { type, options };
    const { status, typeMap } = await this.legacyEnsureAuthorized(
      type,
      'open_point_in_time',
      options?.namespaces,
      {
        args,
        // Partial authorization is acceptable in this case because this method is only designed
        // to be used with `find`, which already allows for partial authorization.
        requireFullAuthorization: false,
      }
    );

    if (status === 'unauthorized') {
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.OPEN_POINT_IN_TIME,
          error: new Error(status),
        })
      );
      throw SavedObjectsErrorHelpers.decorateForbiddenError(new Error(status));
    }

    this.auditLogger.log(
      savedObjectEvent({
        action: SavedObjectAction.OPEN_POINT_IN_TIME,
        outcome: 'unknown',
      })
    );

    const allowedTypes = [...typeMap.keys()]; // only allow the user to open a PIT against indices for type(s) they are authorized to access
    return await this.baseClient.openPointInTimeForType(allowedTypes, options);
  }

  public async closePointInTime(id: string, options?: SavedObjectsClosePointInTimeOptions) {
    // We are intentionally omitting a call to `ensureAuthorized` here, because `closePointInTime`
    // doesn't take in `types`, which are required to perform authorization. As there is no way
    // to know what index/indices a PIT was created against, we have no practical means of
    // authorizing users. We've decided we are okay with this because:
    //   (a) Elasticsearch only requires `read` privileges on an index in order to open/close
    //       a PIT against it, and;
    //   (b) By the time a user is accessing this service, they are already authenticated
    //       to Kibana, which is our closest equivalent to Elasticsearch's `read`.
    this.auditLogger.log(
      savedObjectEvent({
        action: SavedObjectAction.CLOSE_POINT_IN_TIME,
        outcome: 'unknown',
      })
    );

    return await this.baseClient.closePointInTime(id, options);
  }

  public createPointInTimeFinder<T = unknown, A = unknown>(
    findOptions: SavedObjectsCreatePointInTimeFinderOptions,
    dependencies?: SavedObjectsCreatePointInTimeFinderDependencies
  ) {
    // We don't need to perform an authorization check here or add an audit log, because
    // `createPointInTimeFinder` is simply a helper that calls `find`, `openPointInTimeForType`,
    // and `closePointInTime` internally, so authz checks and audit logs will already be applied.
    return this.baseClient.createPointInTimeFinder<T, A>(findOptions, {
      client: this,
      // Include dependencies last so that subsequent SO client wrappers have their settings applied.
      ...dependencies,
    });
  }

  public async collectMultiNamespaceReferences(
    objects: SavedObjectsCollectMultiNamespaceReferencesObject[],
    options: SavedObjectsCollectMultiNamespaceReferencesOptions = {}
  ): Promise<SavedObjectsCollectMultiNamespaceReferencesResponse> {
    const currentSpaceId = SavedObjectsUtils.namespaceIdToString(options.namespace); // We need this whether the Spaces plugin is enabled or not.

    // We don't know the space(s) that each object exists in, so we'll collect the objects and references first, then check authorization.
    const response = await this.baseClient.collectMultiNamespaceReferences(objects, options);
    const uniqueTypes = this.getUniqueObjectTypes(response.objects);
    const uniqueSpaces = this.getUniqueSpaces(
      currentSpaceId,
      ...response.objects.flatMap(({ spaces, spacesWithMatchingAliases = [] }) =>
        spaces.concat(spacesWithMatchingAliases)
      )
    );

    const { typeActionMap } = await this.ensureAuthorized(
      uniqueTypes,
      options.purpose === 'updateObjectsSpaces' ? ['bulk_get', 'share_to_space'] : ['bulk_get'],
      uniqueSpaces,
      { requireFullAuthorization: false }
    );

    // The user must be authorized to access every requested object in the current space.
    // Note: non-multi-namespace object types will have an empty spaces array.
    const authAction = options.purpose === 'updateObjectsSpaces' ? 'share_to_space' : 'bulk_get';
    try {
      this.ensureAuthorizedInAllSpaces(objects, authAction, typeActionMap, [currentSpaceId]);
    } catch (error) {
      objects.forEach(({ type, id }) =>
        this.auditLogger.log(
          savedObjectEvent({
            action: SavedObjectAction.COLLECT_MULTINAMESPACE_REFERENCES,
            savedObject: { type, id },
            error,
          })
        )
      );
      throw error;
    }

    // The user is authorized to access all of the requested objects in the space(s) that they exist in.
    // Now: 1. omit any result objects that the user has no access to, 2. for the rest, redact any space(s) that the user is not authorized
    // for, and 3. create audit records for any objects that will be returned to the user.
    const requestedObjectsSet = objects.reduce(
      (acc, { type, id }) => acc.add(`${type}:${id}`),
      new Set<string>()
    );
    const retrievedObjectsSet = response.objects.reduce(
      (acc, { type, id }) => acc.add(`${type}:${id}`),
      new Set<string>()
    );
    const traversedObjects = new Set<string>();
    const filteredObjectsMap = new Map<string, SavedObjectReferenceWithContext>();
    const getIsAuthorizedForInboundReference = (inbound: { type: string; id: string }) => {
      const found = filteredObjectsMap.get(`${inbound.type}:${inbound.id}`);
      return found && !found.isMissing; // If true, this object can be linked back to one of the requested objects
    };
    let objectsToProcess = [...response.objects];
    while (objectsToProcess.length > 0) {
      const obj = objectsToProcess.shift()!;
      const { type, id, spaces, inboundReferences } = obj;
      const objKey = `${type}:${id}`;
      traversedObjects.add(objKey);
      // Is the user authorized to access this object in all required space(s)?
      const isAuthorizedForObject = isAuthorizedForObjectInAllSpaces(
        type,
        authAction,
        typeActionMap,
        [currentSpaceId]
      );
      // Redact the inbound references so we don't leak any info about other objects that the user is not authorized to access
      const redactedInboundReferences = inboundReferences.filter((inbound) => {
        if (inbound.type === type && inbound.id === id) {
          // circular reference, don't redact it
          return true;
        }
        return getIsAuthorizedForInboundReference(inbound);
      });
      // If the user is not authorized to access at least one inbound reference of this object, then we should omit this object.
      const isAuthorizedForGraph =
        requestedObjectsSet.has(objKey) || // If true, this is one of the requested objects, and we checked authorization above
        redactedInboundReferences.some(getIsAuthorizedForInboundReference);

      if (isAuthorizedForObject && isAuthorizedForGraph) {
        if (spaces.length) {
          // Don't generate audit records for "empty results" with zero spaces (requested object was a non-multi-namespace type or hidden type)
          this.auditLogger.log(
            savedObjectEvent({
              action: SavedObjectAction.COLLECT_MULTINAMESPACE_REFERENCES,
              savedObject: { type, id },
            })
          );
        }
        filteredObjectsMap.set(objKey, obj);
      } else if (!isAuthorizedForObject && isAuthorizedForGraph) {
        filteredObjectsMap.set(objKey, { ...obj, spaces: [], isMissing: true });
      } else if (isAuthorizedForObject && !isAuthorizedForGraph) {
        const hasUntraversedInboundReferences = inboundReferences.some(
          (ref) =>
            !traversedObjects.has(`${ref.type}:${ref.id}`) &&
            retrievedObjectsSet.has(`${ref.type}:${ref.id}`)
        );

        if (hasUntraversedInboundReferences) {
          // this object has inbound reference(s) that we haven't traversed yet; bump it to the back of the list
          objectsToProcess = [...objectsToProcess, obj];
        } else {
          // There should never be a missing inbound reference.
          // If there is, then something has gone terribly wrong.
          const missingInboundReference = inboundReferences.find(
            (ref) =>
              !traversedObjects.has(`${ref.type}:${ref.id}`) &&
              !retrievedObjectsSet.has(`${ref.type}:${ref.id}`)
          );

          if (missingInboundReference) {
            throw new Error(
              `Unexpected inbound reference to "${missingInboundReference.type}:${missingInboundReference.id}"`
            );
          }
        }
      }
    }

    const filteredAndRedactedObjects = [...filteredObjectsMap.values()].map((obj) => {
      const { type, id, spaces, spacesWithMatchingAliases, inboundReferences } = obj;
      // Redact the inbound references so we don't leak any info about other objects that the user is not authorized to access
      const redactedInboundReferences = inboundReferences.filter((inbound) => {
        if (inbound.type === type && inbound.id === id) {
          // circular reference, don't redact it
          return true;
        }
        return getIsAuthorizedForInboundReference(inbound);
      });
      const redactedSpaces = getRedactedSpaces(type, 'bulk_get', typeActionMap, spaces);
      const redactedSpacesWithMatchingAliases =
        spacesWithMatchingAliases &&
        getRedactedSpaces(type, 'bulk_get', typeActionMap, spacesWithMatchingAliases);
      return {
        ...obj,
        spaces: redactedSpaces,
        ...(redactedSpacesWithMatchingAliases && {
          spacesWithMatchingAliases: redactedSpacesWithMatchingAliases,
        }),
        inboundReferences: redactedInboundReferences,
      };
    });

    return {
      objects: filteredAndRedactedObjects,
    };
  }

  public async updateObjectsSpaces(
    objects: SavedObjectsUpdateObjectsSpacesObject[],
    spacesToAdd: string[],
    spacesToRemove: string[],
    options: SavedObjectsUpdateObjectsSpacesOptions = {}
  ) {
    const { namespace } = options;
    const currentSpaceId = SavedObjectsUtils.namespaceIdToString(namespace); // We need this whether the Spaces plugin is enabled or not.

    const allSpacesSet = new Set<string>([currentSpaceId, ...spacesToAdd, ...spacesToRemove]);
    const bulkGetResponse = await this.baseClient.bulkGet(objects, { namespace });
    const objectsToUpdate = objects.map(({ type, id }, i) => {
      const { namespaces: spaces = [], version } = bulkGetResponse.saved_objects[i];
      // If 'namespaces' is undefined, the object was not found (or it is namespace-agnostic).
      // Either way, we will pass in an empty 'spaces' array to the base client, which will cause it to skip this object.
      for (const space of spaces) {
        if (space !== ALL_SPACES_ID) {
          // If this is a specific space, add it to the spaces we'll check privileges for (don't accidentally check for global privileges)
          allSpacesSet.add(space);
        }
      }
      return { type, id, spaces, version };
    });

    const uniqueTypes = this.getUniqueObjectTypes(objects);
    const { typeActionMap } = await this.ensureAuthorized(
      uniqueTypes,
      ['bulk_get', 'share_to_space'],
      Array.from(allSpacesSet),
      { requireFullAuthorization: false }
    );

    const addToSpaces = spacesToAdd.length ? spacesToAdd : undefined;
    const deleteFromSpaces = spacesToRemove.length ? spacesToRemove : undefined;
    try {
      // The user must be authorized to share every requested object in each of: the current space, spacesToAdd, and spacesToRemove.
      const spaces = this.getUniqueSpaces(currentSpaceId, ...spacesToAdd, ...spacesToRemove);
      this.ensureAuthorizedInAllSpaces(objects, 'share_to_space', typeActionMap, spaces);
    } catch (error) {
      objects.forEach(({ type, id }) =>
        this.auditLogger.log(
          savedObjectEvent({
            action: SavedObjectAction.UPDATE_OBJECTS_SPACES,
            savedObject: { type, id },
            addToSpaces,
            deleteFromSpaces,
            error,
          })
        )
      );
      throw error;
    }
    for (const { type, id } of objectsToUpdate) {
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.UPDATE_OBJECTS_SPACES,
          outcome: 'unknown',
          savedObject: { type, id },
          addToSpaces,
          deleteFromSpaces,
        })
      );
    }

    const response = await this.baseClient.updateObjectsSpaces(
      objectsToUpdate,
      spacesToAdd,
      spacesToRemove,
      { namespace }
    );
    // Now that we have updated the objects' spaces, redact any spaces that the user is not authorized to see from the response.
    const redactedObjects = response.objects.map((obj) => {
      const { type, spaces } = obj;
      const redactedSpaces = getRedactedSpaces(type, 'bulk_get', typeActionMap, spaces);
      return { ...obj, spaces: redactedSpaces };
    });

    return { objects: redactedObjects };
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

  private async legacyEnsureAuthorized(
    typeOrTypes: string | string[],
    action: string,
    namespaceOrNamespaces: undefined | string | Array<undefined | string>,
    options: LegacyEnsureAuthorizedOptions = {}
  ): Promise<LegacyEnsureAuthorizedResult> {
    const { requireFullAuthorization = true } = options;
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const actionsToTypesMap = new Map(
      types.map((type) => [this.actions.savedObject.get(type, action), type])
    );
    const actions = Array.from(actionsToTypesMap.keys());
    const result = await this.checkPrivileges(actions, namespaceOrNamespaces);

    const { hasAllRequested, privileges } = result;

    const missingPrivileges = this.getMissingPrivileges(privileges);
    const typeMap = privileges.kibana.reduce<Map<string, LegacyEnsureAuthorizedTypeResult>>(
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

    if (hasAllRequested) {
      return { typeMap, status: 'fully_authorized' };
    } else if (!requireFullAuthorization) {
      const isPartiallyAuthorized = privileges.kibana.some(({ authorized }) => authorized);
      if (isPartiallyAuthorized) {
        return { typeMap, status: 'partially_authorized' };
      } else {
        return { typeMap, status: 'unauthorized' };
      }
    } else {
      const targetTypes = uniq(
        missingPrivileges.map(({ privilege }) => actionsToTypesMap.get(privilege)).sort()
      ).join(',');
      const msg = `Unable to ${action} ${targetTypes}`;
      throw this.errors.decorateForbiddenError(new Error(msg));
    }
  }

  /** Unlike `legacyEnsureAuthorized`, this accepts multiple actions, and it does not utilize legacy audit logging */
  private async ensureAuthorized<T extends string>(
    types: string[],
    actions: T[],
    namespaces: string[],
    options?: EnsureAuthorizedOptions
  ) {
    const ensureAuthorizedDependencies: EnsureAuthorizedDependencies = {
      actions: this.actions,
      errors: this.errors,
      checkSavedObjectsPrivilegesAsCurrentUser: this.checkSavedObjectsPrivilegesAsCurrentUser,
    };
    return ensureAuthorized(ensureAuthorizedDependencies, types, actions, namespaces, options);
  }

  /**
   * If `ensureAuthorized` was called with `requireFullAuthorization: false`, this can be used with the result to ensure that a given
   * array of objects are authorized in the required space(s).
   */
  private ensureAuthorizedInAllSpaces<T extends string>(
    objects: Array<{ type: string }>,
    action: T,
    typeActionMap: EnsureAuthorizedResult<T>['typeActionMap'],
    spaces: string[]
  ) {
    const uniqueTypes = uniq(objects.map(({ type }) => type));
    const unauthorizedTypes = new Set<string>();
    for (const type of uniqueTypes) {
      if (!isAuthorizedForObjectInAllSpaces(type, action, typeActionMap, spaces)) {
        unauthorizedTypes.add(type);
      }
    }
    if (unauthorizedTypes.size > 0) {
      const targetTypes = Array.from(unauthorizedTypes).sort().join(',');
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

  /**
   * Given a list of spaces, returns a unique array of spaces.
   * Excludes `'*'`, which is an identifier for All Spaces but is not an actual space.
   */
  private getUniqueSpaces(...spaces: string[]) {
    const set = new Set(spaces);
    set.delete(ALL_SPACES_ID);
    return Array.from(set);
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
    // WARNING: the bulkResolve function has a bespoke implementation of this; any changes here should be applied there too.

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

function getRedactedSpaces<T extends string>(
  objectType: string,
  action: T,
  typeActionMap: EnsureAuthorizedResult<T>['typeActionMap'],
  spacesToRedact: string[]
) {
  const actionResult = getEnsureAuthorizedActionResult(objectType, action, typeActionMap);
  const { authorizedSpaces, isGloballyAuthorized } = actionResult;
  const authorizedSpacesSet = new Set(authorizedSpaces);
  return spacesToRedact
    .map((x) =>
      isGloballyAuthorized || x === ALL_SPACES_ID || authorizedSpacesSet.has(x) ? x : UNKNOWN_SPACE
    )
    .sort(namespaceComparator);
}
