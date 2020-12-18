/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  ISavedObjectTypeRegistry,
  SavedObject,
  SavedObjectAccessControl,
  SavedObjectReferenceWithContext,
  SavedObjectsBaseOptions,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkCreateOptions,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsCheckConflictsObject,
  SavedObjectsCheckConflictsOptions,
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

import type { AuthenticatedUser } from '..';
import { SavedObjectsUtils } from '../../../../../src/core/server';
import { esKuery } from '../../../../../src/plugins/data/server';
import { ALL_SPACES_ID, UNKNOWN_SPACE } from '../../common/constants';
import type { AuditLogger, SecurityAuditLogger } from '../audit';
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
  legacyAuditLogger: SecurityAuditLogger;
  auditLogger: AuditLogger;
  baseClient: SavedObjectsClientContract;
  typeRegistry: ISavedObjectTypeRegistry;
  errors: SavedObjectsClientContract['errors'];
  checkSavedObjectsPrivilegesAsCurrentUser: CheckSavedObjectsPrivileges;
  getCurrentUser(): AuthenticatedUser | null;
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
  savedObject?: SavedObject<unknown> | null;
}

interface LegacyEnsureAuthorizedResult {
  status: 'fully_authorized' | 'partially_authorized' | 'unauthorized';
  typeMap: Map<string, LegacyEnsureAuthorizedTypeResult>;
  requiresObjectAuthorization: boolean;
  canSpecifyAccessControl: boolean;
  legacyAuditLogger: {
    logAuthorized(): void;
  };
}
interface LegacyEnsureAuthorizedTypeResult {
  authorizedSpaces: string[];
  isGloballyAuthorized?: boolean;
}
export class SecureSavedObjectsClientWrapper implements SavedObjectsClientContract {
  private readonly actions: Actions;
  private readonly legacyAuditLogger: PublicMethodsOf<SecurityAuditLogger>;
  private readonly auditLogger: AuditLogger;
  private readonly baseClient: SavedObjectsClientContract;
  private readonly typeRegistry: ISavedObjectTypeRegistry;
  private readonly checkSavedObjectsPrivilegesAsCurrentUser: CheckSavedObjectsPrivileges;
  private getSpacesService: () => SpacesService | undefined;
  private getCurrentUser: () => AuthenticatedUser | null;
  public readonly errors: SavedObjectsClientContract['errors'];

  constructor({
    actions,
    legacyAuditLogger,
    auditLogger,
    baseClient,
    typeRegistry,
    checkSavedObjectsPrivilegesAsCurrentUser,
    errors,
    getSpacesService,
    getCurrentUser,
  }: SecureSavedObjectsClientWrapperOptions) {
    this.errors = errors;
    this.actions = actions;
    this.legacyAuditLogger = legacyAuditLogger;
    this.auditLogger = auditLogger;
    this.baseClient = baseClient;
    this.typeRegistry = typeRegistry;
    this.checkSavedObjectsPrivilegesAsCurrentUser = checkSavedObjectsPrivilegesAsCurrentUser;
    this.getSpacesService = getSpacesService;
    this.getCurrentUser = getCurrentUser;
  }

  public async create<T = unknown>(
    type: string,
    attributes: T = {} as T,
    options: SavedObjectsCreateOptions = {}
  ) {
    const augmentedOptions = {
      ...options,
      id: options.id ?? SavedObjectsUtils.generateId(),
      accessControl: options.accessControl ?? this.createAccessControl(type),
    };

    const namespaces = [augmentedOptions.namespace, ...(augmentedOptions.initialNamespaces || [])];
    try {
      const action = 'create';
      const args = { type, attributes, options: augmentedOptions };
      const {
        legacyAuditLogger,
        requiresObjectAuthorization,
        canSpecifyAccessControl,
      } = await this.legacyEnsureAuthorized(type, action, namespaces, {
        args,
      });
      if (!canSpecifyAccessControl) {
        this.ensureAccessControlNotSpecified(options);
      }
      // FIXME: this check differs from bulk_create -- one of them is incorrect (probably this one?)
      const needsPreflightCheck = requiresObjectAuthorization && options.overwrite === true;
      if (needsPreflightCheck) {
        await this.ensureAuthorizedForObjects(
          [{ type, id: augmentedOptions.id }],
          augmentedOptions.namespace,
          action
        );
      }
      // Need to wait until we've successfully authorized individual object access before declaring this "authorized"
      legacyAuditLogger.logAuthorized();
    } catch (error) {
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.CREATE,
          savedObject: { type, id: augmentedOptions.id },
          error,
        })
      );
      throw error;
    }
    this.auditLogger.log(
      savedObjectEvent({
        action: SavedObjectAction.CREATE,
        outcome: 'unknown',
        savedObject: { type, id: augmentedOptions.id },
      })
    );

    const savedObject = await this.baseClient.create(type, attributes, augmentedOptions);
    return await this.redactSavedObjectNamespaces(savedObject, namespaces);
  }

  public async checkConflicts(
    objects: SavedObjectsCheckConflictsObject[] = [],
    options: SavedObjectsCheckConflictsOptions = {}
  ) {
    this.ensureAccessControlNotSpecified(options);
    const args = { objects, options };
    const types = this.getUniqueObjectTypes(objects);
    const { legacyAuditLogger } = await this.legacyEnsureAuthorized(
      types,
      'bulk_create',
      options.namespace,
      {
        args,
        auditAction: 'checkConflicts',
      }
    );
    legacyAuditLogger.logAuthorized();

    return this.baseClient.checkConflicts(objects, {
      ...options,
      accessControl: {
        owner: this.getOwner(),
      },
    });
  }

  public async bulkCreate<T = unknown>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options: SavedObjectsBulkCreateOptions = {}
  ) {
    let hasAccessControlSpecified = false;
    const objectsWithId: Array<SavedObjectsBulkCreateObject<T> & { id: string }> = [];
    objects.forEach((obj) => {
      objectsWithId.push({
        ...obj,
        id: obj.id ?? SavedObjectsUtils.generateId(),
        accessControl: obj.accessControl ?? this.createAccessControl(obj.type),
      });
      hasAccessControlSpecified = hasAccessControlSpecified || obj.accessControl != null;
    });

    const namespaces = objectsWithId.reduce(
      (acc, { initialNamespaces = [] }) => acc.concat(initialNamespaces),
      [options.namespace]
    );
    try {
      const action = 'bulk_create';
      const args = { objects: objectsWithId, options };
      const {
        legacyAuditLogger,
        requiresObjectAuthorization,
        canSpecifyAccessControl,
      } = await this.legacyEnsureAuthorized(
        this.getUniqueObjectTypes(objectsWithId),
        action,
        namespaces,
        {
          args,
        }
      );

      if (!canSpecifyAccessControl && hasAccessControlSpecified) {
        throw this.errors.decorateForbiddenError(new Error('ACL cannot be specified'));
      }
      const requiresPreflightCheck = requiresObjectAuthorization;
      if (requiresPreflightCheck) {
        await this.ensureAuthorizedForObjects(objectsWithId, options.namespace, action);
      }
      // Need to wait until we've successfully authorized individual object access before declaring this "authorized"
      legacyAuditLogger.logAuthorized();
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
      const action = 'delete';
      const args = { type, id, options };
      const {
        legacyAuditLogger,
        requiresObjectAuthorization,
      } = await this.legacyEnsureAuthorized(type, action, options.namespace, { args });
      if (requiresObjectAuthorization) {
        await this.ensureAuthorizedForObjects([{ type, id }], options.namespace, action);
      }
      // Need to wait until we've successfully authorized individual object access before declaring this "authorized"
      legacyAuditLogger.logAuthorized();
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
    if (options.pit && Array.isArray(options.namespaces) && options.namespaces.length > 1) {
      throw this.errors.createBadRequestError(
        '_find across namespaces is not permitted when using the `pit` option.'
      );
    }

    const args = { options };
    const {
      status,
      typeMap,
      legacyAuditLogger,
      requiresObjectAuthorization,
    } = await this.legacyEnsureAuthorized(options.type, 'find', options.namespaces, {
      args,
      requireFullAuthorization: false,
    });

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

    legacyAuditLogger.logAuthorized();

    const typeToNamespacesMap = Array.from(typeMap).reduce<Map<string, string[] | undefined>>(
      (acc, [type, { authorizedSpaces, isGloballyAuthorized }]) =>
        isGloballyAuthorized ? acc.set(type, options.namespaces) : acc.set(type, authorizedSpaces),
      new Map()
    );

    const filterClauses = Array.from(typeMap.keys()).reduce((acc, type) => {
      if (this.typeRegistry.isPrivate(type) && requiresObjectAuthorization) {
        return [
          ...acc,
          // note: this relies on specific behavior of the SO service's `filter_utils`,
          // which automatically wraps this in an `and` node to ensure the type is accounted for.
          // we have added additional safeguards there, and functional tests will ensure that changes
          // to this logic will not accidentally alter our authorization model.

          // This is equivalent to writing the following, if this syntax was allowed by the SO `filter` option:
          // esKuery.nodeTypes.function.buildNode('and', [
          //   esKuery.nodeTypes.function.buildNode('is', `accessControl.owner`, this.getOwner()),
          //   esKuery.nodeTypes.function.buildNode('is', `type`, type),
          // ])
          esKuery.nodeTypes.function.buildNode(
            'is',
            `${type}.accessControl.owner`,
            this.getOwner()
          ),
        ];
      }
      return acc;
    }, [] as unknown[]);

    const confidentialObjectsFilter =
      filterClauses.length > 0 ? esKuery.nodeTypes.function.buildNode('or', filterClauses) : null;

    let filter;
    if (options.filter && confidentialObjectsFilter) {
      const existingFilter =
        typeof options.filter === 'string'
          ? esKuery.fromKueryExpression(options.filter)
          : options.filter;

      filter = esKuery.nodeTypes.function.buildNode('and', [
        existingFilter,
        confidentialObjectsFilter,
      ]);
    } else if (confidentialObjectsFilter) {
      filter = confidentialObjectsFilter;
    } else {
      filter = options.filter;
    }

    const response = await this.baseClient.find<T, A>({
      ...options,
      typeToNamespacesMap: undefined, // if the user is fully authorized, use `undefined` as the typeToNamespacesMap to prevent privilege escalation
      ...(status === 'partially_authorized' && { typeToNamespacesMap, type: '', namespaces: [] }), // the repository requires that `type` and `namespaces` must be empty if `typeToNamespacesMap` is defined
      filter,
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
    let legacyAuditLogger;
    let requiresObjectAuthorization: boolean;
    const action = 'bulk_get';
    try {
      const args = { objects, options };
      ({ legacyAuditLogger, requiresObjectAuthorization } = await this.legacyEnsureAuthorized(
        this.getUniqueObjectTypes(objects),
        action,
        options.namespace,
        {
          args,
        }
      ));
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

    const savedObjects = response.saved_objects.map((object) => {
      if (requiresObjectAuthorization && !this.isAuthorizedForObject(object)) {
        const error = this.createForbiddenObjectError(action, object);
        this.auditLogger.log(
          savedObjectEvent({
            action: SavedObjectAction.GET,
            savedObject: { type: object.type, id: object.id },
            error,
          })
        );
        return ({
          type: object.type,
          id: object.id,
          error: error.output.payload,
        } as unknown) as SavedObject<T>;
      }
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.GET,
          savedObject: { type: object.type, id: object.id },
        })
      );
      return object;
    });

    legacyAuditLogger.logAuthorized();

    return this.redactSavedObjectsNamespaces({ ...response, saved_objects: savedObjects }, [
      options.namespace,
    ]);
  }

  public async get<T = unknown>(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    let legacyAuditLogger;
    let requiresObjectAuthorization: boolean;
    const action = 'get';
    try {
      const args = { type, id, options };
      ({ legacyAuditLogger, requiresObjectAuthorization } = await this.legacyEnsureAuthorized(
        type,
        action,
        options.namespace,
        { args }
      ));
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

    if (requiresObjectAuthorization && !this.isAuthorizedForObject(savedObject)) {
      const error = this.createForbiddenObjectError(action, savedObject);
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.GET,
          savedObject: { type, id },
          error,
        })
      );
      throw error;
    }

    legacyAuditLogger.logAuthorized();
    this.auditLogger.log(
      savedObjectEvent({
        action: SavedObjectAction.GET,
        savedObject: { type, id },
      })
    );

    return await this.redactSavedObjectNamespaces(savedObject, [options.namespace]);
  }

  public async resolve<T = unknown>(
    type: string,
    id: string,
    options: SavedObjectsBaseOptions = {}
  ) {
    this.ensureAccessControlNotSpecified(options);
    const action = 'get';
    let legacyAuditLogger;
    let requiresObjectAuthorization: boolean;
    try {
      const args = { type, id, options };
      ({ legacyAuditLogger, requiresObjectAuthorization } = await this.legacyEnsureAuthorized(
        type,
        action,
        options.namespace,
        {
          args,
          auditAction: 'resolve',
        }
      ));
      legacyAuditLogger.logAuthorized();
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

    if (requiresObjectAuthorization && !this.isAuthorizedForObject(resolveResult.saved_object)) {
      const error = this.createForbiddenObjectError(action, resolveResult.saved_object);
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.RESOLVE,
          savedObject: resolveResult.saved_object,
          error,
        })
      );
      throw error;
    }

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
    this.ensureAccessControlNotSpecified(options);
    try {
      const action = 'update';
      const args = { type, id, attributes, options };
      const {
        legacyAuditLogger,
        requiresObjectAuthorization,
      } = await this.legacyEnsureAuthorized(type, action, options.namespace, { args });
      if (requiresObjectAuthorization) {
        await this.ensureAuthorizedForObjects([{ type, id }], options.namespace, action);
      }
      legacyAuditLogger.logAuthorized();
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

    // const augmentedOptions = { ...options, accessControl: this.createACL(type) };
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
      const action = 'bulk_update';
      const args = { objects, options };
      const { legacyAuditLogger, requiresObjectAuthorization } = await this.legacyEnsureAuthorized(
        this.getUniqueObjectTypes(objects),
        action,
        namespaces,
        {
          args,
        }
      );
      if (requiresObjectAuthorization) {
        await this.ensureAuthorizedForObjects(objects, options.namespace, action);
      }
      legacyAuditLogger.logAuthorized();
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
      const action = 'delete';
      const args = { type, id, options };
      const { legacyAuditLogger, requiresObjectAuthorization } = await this.legacyEnsureAuthorized(
        type,
        action,
        options.namespace,
        {
          args,
          auditAction: 'removeReferences',
        }
      );
      if (requiresObjectAuthorization) {
        await this.ensureAuthorizedForObjects([{ type, id }], options.namespace, action);
      }
      legacyAuditLogger.logAuthorized();
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
    try {
      const args = { type, options };
      const { legacyAuditLogger } = await this.legacyEnsureAuthorized(
        type,
        'open_point_in_time',
        options?.namespace,
        {
          args,
          // Partial authorization is acceptable in this case because this method is only designed
          // to be used with `find`, which already allows for partial authorization.
          requireFullAuthorization: false,
        }
      );
      legacyAuditLogger.logAuthorized();
    } catch (error) {
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.OPEN_POINT_IN_TIME,
          error,
        })
      );
      throw error;
    }

    this.auditLogger.log(
      savedObjectEvent({
        action: SavedObjectAction.OPEN_POINT_IN_TIME,
        outcome: 'unknown',
      })
    );

    return await this.baseClient.openPointInTimeForType(type, options);
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

    const { typeActionMap, requiresObjectAuthorization } = await this.ensureAuthorized(
      uniqueTypes,
      options.purpose === 'updateObjectsSpaces' ? ['bulk_get', 'share_to_space'] : ['bulk_get'],
      uniqueSpaces,
      { requireFullAuthorization: false }
    );

    const requestedObjectsSet = objects.reduce(
      (acc, { type, id }) => acc.add(`${type}:${id}`),
      new Set<string>()
    );
    const retrievedObjectsMap = response.objects.reduce(
      (acc, object) => acc.set(`${object.type}:${object.id}`, object),
      new Map<string, SavedObjectReferenceWithContext>()
    );

    // The user must be authorized to access every requested object in the current space.
    // Note: non-multi-namespace object types will have an empty spaces array.
    const authAction = options.purpose === 'updateObjectsSpaces' ? 'share_to_space' : 'bulk_get';
    try {
      const requestedObjects = objects.map(
        ({ type, id }) => retrievedObjectsMap.get(`${type}:${id}`)!
      );
      this.ensureAuthorizedInAllSpaces(
        requestedObjects,
        authAction,
        typeActionMap,
        [currentSpaceId],
        requiresObjectAuthorization
      );
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
      const isAuthorizedForObject =
        (!requiresObjectAuthorization || this.isAuthorizedForObject(obj)) &&
        isAuthorizedForObjectInAllSpaces(type, authAction, typeActionMap, [currentSpaceId]);
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
            retrievedObjectsMap.has(`${ref.type}:${ref.id}`)
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
              !retrievedObjectsMap.has(`${ref.type}:${ref.id}`)
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
    const objectsToUpdate: Array<SavedObject<unknown>> = objects.map(({ type, id }, i) => {
      const {
        namespaces: spaces = [],
        version,
        attributes,
        accessControl,
        references,
      } = bulkGetResponse.saved_objects[i];
      // If 'namespaces' is undefined, the object was not found (or it is namespace-agnostic).
      // Either way, we will pass in an empty 'spaces' array to the base client, which will cause it to skip this object.
      for (const space of spaces) {
        if (space !== ALL_SPACES_ID) {
          // If this is a specific space, add it to the spaces we'll check privileges for (don't accidentally check for global privileges)
          allSpacesSet.add(space);
        }
      }
      return { type, id, spaces, version, attributes, accessControl, references };
    });

    const uniqueTypes = this.getUniqueObjectTypes(objects);
    const { typeActionMap, requiresObjectAuthorization } = await this.ensureAuthorized(
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
      this.ensureAuthorizedInAllSpaces(
        objectsToUpdate,
        'share_to_space',
        typeActionMap,
        spaces,
        requiresObjectAuthorization
      );
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

  private async ensureAuthorizedForObjects(
    objects: Array<{ type: string; id: string }>,
    namespace: string | undefined,
    action: string
  ) {
    const objectsToRetrieve = objects.filter((so) => this.typeRegistry.isPrivate(so.type));
    if (objectsToRetrieve.length === 0) {
      return;
    }
    const confidentialObjects = await this.baseClient.bulkGet(objectsToRetrieve, { namespace });
    confidentialObjects.saved_objects.forEach((object) => {
      if (!this.isAuthorizedForObject(object)) {
        throw this.createForbiddenObjectError(action, object);
      }
    });
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

  private createAccessControl(type: string): SavedObjectAccessControl | undefined {
    if (!this.typeRegistry.isPrivate(type)) {
      return;
    }
    return {
      owner: this.getOwner(),
    };
  }

  private getOwner() {
    // FIXME: `username` is not a valid owner
    const { username } = this.getCurrentUser() ?? {};
    if (!username) {
      throw this.errors.decorateGeneralError(new Error(`Unable to retrieve owner`));
    }
    return username;
  }

  private ensureAccessControlNotSpecified(options: Record<string, any>) {
    if (options?.accessControl != null) {
      throw this.errors.createBadRequestError(
        `Setting an accessControl is not permitted for this operation.`
      );
    }
  }

  private isAuthorizedForObject(object: SavedObject<unknown> | SavedObjectReferenceWithContext) {
    if (!this.typeRegistry.isPrivate(object.type)) {
      return true;
    }

    if (this.isSavedObjectReference(object)) {
      if (object.isMissing) {
        return true;
      }
    } else {
      // type is SavedObject<unknown>
      if (object.error != null && object.attributes == null) {
        // object not found
        return true;
      }
    }

    if (!object.accessControl?.owner) {
      throw this.errors.decorateGeneralError(
        new Error(`Unable to verify object ownership due to missing access control declaration`)
      );
    }

    return object.accessControl?.owner === this.getOwner();
  }

  private async legacyEnsureAuthorized(
    typeOrTypes: string | string[],
    action: string,
    namespaceOrNamespaces: undefined | string | Array<undefined | string>,
    options: LegacyEnsureAuthorizedOptions = {}
  ): Promise<LegacyEnsureAuthorizedResult> {
    const { args, auditAction = action, requireFullAuthorization = true } = options;
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const actionsToTypesMap = new Map(
      types.map((type) => [this.actions.savedObject.get(type, action), type])
    );
    const actions = [this.actions.savedObject.manage, ...Array.from(actionsToTypesMap.keys())];
    const result = await this.checkPrivileges(actions, namespaceOrNamespaces);

    const { hasAllRequested, username, privileges } = result;

    const spaceIds = uniq(
      privileges.kibana.map(({ resource }) => resource).filter((x) => x !== undefined)
    ).sort() as string[];

    const missingPrivileges = this.getMissingPrivileges(privileges, [
      this.actions.savedObject.manage,
    ]);

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

    const isFullyAuthorized = missingPrivileges.length === 0;
    // `hasAllRequested` comes from the ES privilege check above, which has been augmented to include the "manage" saved object privilege.
    const requiresObjectAuthorization = hasAllRequested === false;
    const canSpecifyAccessControl = hasAllRequested === true;
    if (isFullyAuthorized) {
      return {
        typeMap,
        status: 'fully_authorized',
        requiresObjectAuthorization,
        canSpecifyAccessControl,
        legacyAuditLogger: {
          logAuthorized: () => logAuthorizationSuccess(types, spaceIds),
        },
      };
    } else if (!requireFullAuthorization) {
      const isPartiallyAuthorized = privileges.kibana.some(({ authorized }) => authorized);
      if (isPartiallyAuthorized) {
        return {
          typeMap,
          status: 'partially_authorized',
          requiresObjectAuthorization,
          canSpecifyAccessControl,
          legacyAuditLogger: {
            logAuthorized: () => {
              for (const [type, { isGloballyAuthorized, authorizedSpaces }] of typeMap.entries()) {
                // generate an individual audit record for each authorized type
                logAuthorizationSuccess([type], isGloballyAuthorized ? spaceIds : authorizedSpaces);
              }
            },
          },
        };
      } else {
        logAuthorizationFailure();
        return {
          typeMap,
          status: 'unauthorized',
          requiresObjectAuthorization,
          canSpecifyAccessControl,
          legacyAuditLogger: {
            logAuthorized: () => {},
          },
        };
      }
    } else {
      logAuthorizationFailure();
      const targetTypes = uniq(
        missingPrivileges.map(({ privilege }) => actionsToTypesMap.get(privilege)!).sort()
      );
      throw this.createForbiddenTypesError(action, targetTypes);
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
    objects: Array<SavedObject<unknown>> | SavedObjectReferenceWithContext[],
    action: T,
    typeActionMap: EnsureAuthorizedResult<T>['typeActionMap'],
    spaces: string[],
    requiresObjectAuthorization: boolean
  ) {
    const uniqueTypes = uniq((objects as Array<{ type: string }>).map(({ type }) => type));
    const unauthorizedTypes = new Set<string>();
    for (const type of uniqueTypes) {
      if (!isAuthorizedForObjectInAllSpaces(type, action, typeActionMap, spaces)) {
        unauthorizedTypes.add(type);
      }
    }
    if (unauthorizedTypes.size > 0) {
      throw this.createForbiddenTypesError(action, Array.from(unauthorizedTypes));
    }
    if (requiresObjectAuthorization) {
      objects.forEach((object: SavedObject<unknown> | SavedObjectReferenceWithContext) => {
        if (!this.isAuthorizedForObject(object)) {
          throw this.createForbiddenObjectError(action, object);
        }
      });
    }
  }

  private createForbiddenTypesError(action: string, targetTypes: string[]) {
    const msg = `Unable to ${action} ${targetTypes.sort().join(',')}`;
    return this.errors.decorateForbiddenError(new Error(msg));
  }

  private createForbiddenObjectError(action: string, object: { type: string; id: string }) {
    const msg = `Unable to ${action} ${object.type}:${object.id}`;
    return this.errors.decorateForbiddenError(new Error(msg));
  }

  private isSavedObjectReference(
    object: SavedObject<unknown> | SavedObjectReferenceWithContext
  ): object is SavedObjectReferenceWithContext {
    return Array.isArray((object as SavedObjectReferenceWithContext).inboundReferences);
  }

  private getMissingPrivileges(
    privileges: CheckPrivilegesResponse['privileges'],
    ignorePrivileges: string[] = []
  ) {
    return privileges.kibana
      .filter(({ authorized, privilege }) => !authorized && !ignorePrivileges.includes(privilege))
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
