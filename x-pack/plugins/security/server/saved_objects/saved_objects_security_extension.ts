/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectReferenceWithContext,
  SavedObjectsResolveResponse,
} from '@kbn/core-saved-objects-api-server';
import type { SavedObjectsClient } from '@kbn/core-saved-objects-api-server-internal';
import { isBulkResolveError } from '@kbn/core-saved-objects-api-server-internal/src/lib/internal_bulk_resolve';
import type { BulkResolveError, SavedObject } from '@kbn/core-saved-objects-common';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-common';
import { AuditAction, SecurityAction } from '@kbn/core-saved-objects-server';
import type {
  AddAuditEventParams,
  AuditHelperParams,
  AuthorizationTypeEntry,
  AuthorizationTypeMap,
  AuthorizeAndRedactMultiNamespaceReferencesParams,
  AuthorizeCreateParams,
  AuthorizeUpdateParams,
  CheckAuthorizationParams,
  CheckAuthorizationResult,
  EnforceAuthorizationParams,
  ISavedObjectsSecurityExtension,
  PerformAuthorizationParams,
  RedactNamespacesParams,
  UpdateSpacesAuditHelperParams,
  UpdateSpacesAuditOptions,
} from '@kbn/core-saved-objects-server';
import type {
  AuthorizeAndRedactInternalBulkResolveParams,
  AuthorizeBulkCreateParams,
  AuthorizeBulkUpdateParams,
  InternalAuthorizeOptions,
} from '@kbn/core-saved-objects-server/src/extensions/security';
import { ALL_NAMESPACES_STRING, SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';

import { ALL_SPACES_ID, UNKNOWN_SPACE } from '../../common/constants';
import type { AuditLogger } from '../audit';
import { savedObjectEvent } from '../audit';
import type { Actions, CheckSavedObjectsPrivileges } from '../authorization';
import type { CheckPrivilegesResponse } from '../authorization/types';
import { isAuthorizedInAllSpaces } from './authorization_utils';

interface Params {
  actions: Actions;
  auditLogger: AuditLogger;
  errors: SavedObjectsClient['errors'];
  checkPrivileges: CheckSavedObjectsPrivileges;
}

export class SavedObjectsSecurityExtension implements ISavedObjectsSecurityExtension {
  private readonly actions: Actions;
  private readonly auditLogger: AuditLogger;
  private readonly errors: SavedObjectsClient['errors'];
  private readonly checkPrivilegesFunc: CheckSavedObjectsPrivileges;
  private readonly actionMap: Map<
    SecurityAction,
    { authzAction: string | undefined; auditAction: AuditAction | undefined }
  >;

  constructor({ actions, auditLogger, errors, checkPrivileges }: Params) {
    this.actions = actions;
    this.auditLogger = auditLogger;
    this.errors = errors;
    this.checkPrivilegesFunc = checkPrivileges;

    // OPERATION                          ES AUTH ACTION          AUDIT ACTION
    // -----------------------------------------------------------------------------------------
    // Check Conflicts                    'bulk_create'           N/A
    // Close PIT                          N/A                     AuditAction.CLOSE_POINT_IN_TIME
    // Collect References                 'bulk_get'              AuditAction.COLLECT_MULTINAMESPACE_REFERENCES
    // Collect Refs For Updating Spaces   'share_to_space'        AuditAction.COLLECT_MULTINAMESPACE_REFERENCES
    // Create                             'create'                AuditAction.CREATE
    // Bulk Create                        'bulk_create'           AuditAction.CREATE
    // Delete                             'delete'                AuditAction.DELETE
    // Bulk Delete                        'bulk_delete'           AuditAction.DELETE
    // Find                               'find'                  AuditAction.FIND
    // Get                                'get'                   AuditAction.GET
    // Bulk Get                           'bulk_get'              AuditAction.GET
    // Internal Bulk Resolve              'bulk_get'              AuditAction.RESOLVE
    // Open PIT                           'open_point_in_time'    AuditAction.OPEN_POINT_IN_TIME
    // Remove References                  'delete'                AuditAction.REMOVE_REFERENCES
    // Update                             'update'                AuditAction.UPDATE
    // Bulk Update                        'bulk_update'           AuditAction.UPDATE
    // Update Objects Spaces              'share_to_space'        AuditAction.UPDATE_OBJECTS_SPACES
    this.actionMap = new Map([
      [SecurityAction.CHECK_CONFLICTS, { authzAction: 'bulk_create', auditAction: undefined }],
      [
        SecurityAction.CLOSE_POINT_IN_TIME,
        { authzAction: undefined, auditAction: AuditAction.CLOSE_POINT_IN_TIME },
      ],
      [
        SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES,
        { authzAction: 'bulk_get', auditAction: AuditAction.COLLECT_MULTINAMESPACE_REFERENCES },
      ],
      [
        SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES_UPDATE_SPACES,
        {
          authzAction: 'share_to_space',
          auditAction: AuditAction.COLLECT_MULTINAMESPACE_REFERENCES,
        },
      ],
      [SecurityAction.CREATE, { authzAction: 'create', auditAction: AuditAction.CREATE }],
      [SecurityAction.BULK_CREATE, { authzAction: 'bulk_create', auditAction: AuditAction.CREATE }],
      [SecurityAction.DELETE, { authzAction: 'delete', auditAction: AuditAction.DELETE }],
      [SecurityAction.BULK_DELETE, { authzAction: 'bulk_delete', auditAction: AuditAction.DELETE }],
      [SecurityAction.FIND, { authzAction: 'find', auditAction: AuditAction.FIND }],
      [SecurityAction.GET, { authzAction: 'get', auditAction: AuditAction.GET }],
      [SecurityAction.BULK_GET, { authzAction: 'bulk_get', auditAction: AuditAction.GET }],
      [
        SecurityAction.INTERNAL_BULK_RESOLVE,
        { authzAction: 'bulk_get', auditAction: AuditAction.RESOLVE },
      ],
      [
        SecurityAction.OPEN_POINT_IN_TIME,
        { authzAction: 'open_point_in_time', auditAction: AuditAction.OPEN_POINT_IN_TIME },
      ],
      [
        SecurityAction.REMOVE_REFERENCES,
        { authzAction: 'delete', auditAction: AuditAction.REMOVE_REFERENCES },
      ],
      [SecurityAction.UPDATE, { authzAction: 'update', auditAction: AuditAction.UPDATE }],
      [SecurityAction.BULK_UPDATE, { authzAction: 'bulk_update', auditAction: AuditAction.UPDATE }],
      [
        SecurityAction.UPDATE_OBJECTS_SPACES,
        { authzAction: 'share_to_space', auditAction: AuditAction.UPDATE_OBJECTS_SPACES },
      ],
    ]);
  }

  private translateActions<A extends string>(
    securityActions: Set<SecurityAction>
  ): { authzActions: Set<A>; auditActions: Set<AuditAction> } {
    const authzActions = new Set<A>();
    const auditActions = new Set<AuditAction>();
    for (const secAction of securityActions) {
      const { authzAction, auditAction } = this.decodeSecurityAction(secAction);
      if (authzAction) authzActions.add(authzAction as A);
      if (auditAction) auditActions.add(auditAction as AuditAction);
    }
    return { authzActions, auditActions };
  }

  private decodeSecurityAction(securityAction: SecurityAction): {
    authzAction: string | undefined;
    auditAction: AuditAction | undefined;
  } {
    const { authzAction, auditAction } = this.actionMap.get(securityAction)!;
    return { authzAction, auditAction };
  }

  private async checkAuthorization<A extends string>(
    params: CheckAuthorizationParams<A>
  ): Promise<CheckAuthorizationResult<A>> {
    const { types, spaces, actions, options = { allowGlobalResource: false } } = params;
    const { allowGlobalResource } = options;
    if (types.size === 0) {
      throw new Error('No types specified for authorization check');
    }
    if (spaces.size === 0) {
      throw new Error('No spaces specified for authorization check');
    }
    if (actions.size === 0) {
      throw new Error('No actions specified for authorization check');
    }
    const typesArray = [...types];
    const actionsArray = [...actions];
    const privilegeActionsMap = new Map(
      typesArray.flatMap((type) =>
        actionsArray.map((action) => [this.actions.savedObject.get(type, action), { type, action }])
      )
    );
    const privilegeActions = [...privilegeActionsMap.keys(), this.actions.login]; // Always check login action, we will need it later for redacting namespaces
    const { hasAllRequested, privileges } = await this.checkPrivileges(
      privilegeActions,
      getAuthorizableSpaces(spaces, allowGlobalResource)
    );

    const missingPrivileges = getMissingPrivileges(privileges);
    const typeMap = privileges.kibana.reduce<AuthorizationTypeMap<A>>(
      (acc, { resource, privilege }) => {
        const missingPrivilegesAtResource =
          (resource && missingPrivileges.get(resource)?.has(privilege)) ||
          (!resource && missingPrivileges.get(undefined)?.has(privilege));

        if (missingPrivilegesAtResource) {
          return acc;
        }
        let objTypes: string[];
        let action: A;
        if (privilege === this.actions.login) {
          // Technically, 'login:' is not a saved object action, it is a Kibana privilege -- however, we include it in the `typeMap` results
          // for ease of use with the `redactNamespaces` function. The user is never actually authorized to "login" for a given object type,
          // they are authorized to log in on a per-space basis, and this is applied to each object type in the typeMap result accordingly.
          objTypes = typesArray;
          action = this.actions.login as A;
        } else {
          const entry = privilegeActionsMap.get(privilege)!; // always defined
          objTypes = [entry.type];
          action = entry.action as A;
        }

        for (const type of objTypes) {
          const actionAuthorizations = acc.get(type) ?? ({} as Record<A, AuthorizationTypeEntry>);
          const authorization: AuthorizationTypeEntry = actionAuthorizations[action] ?? {
            authorizedSpaces: [],
          };

          if (resource === undefined) {
            acc.set(type, {
              ...actionAuthorizations,
              [action]: { ...authorization, isGloballyAuthorized: true },
            });
          } else {
            acc.set(type, {
              ...actionAuthorizations,
              [action]: {
                ...authorization,
                authorizedSpaces: authorization.authorizedSpaces.concat(resource),
              },
            });
          }
        }
        return acc;
      },
      new Map()
    );

    if (hasAllRequested) {
      return { typeMap, status: 'fully_authorized' };
    } else if (typeMap.size > 0) {
      for (const entry of typeMap.values()) {
        const typeActions = Object.keys(entry);
        if (actionsArray.some((a) => typeActions.includes(a))) {
          // Only return 'partially_authorized' if the user is actually authorized for one of the actions they requested
          // (e.g., not just the 'login:' action)
          return { typeMap, status: 'partially_authorized' };
        }
      }
    }
    return { typeMap, status: 'unauthorized' };
  }

  private auditHelper(params: AuditHelperParams | UpdateSpacesAuditHelperParams) {
    const { action, useSuccessOutcome, objects, error, addToSpaces, deleteFromSpaces } =
      params as UpdateSpacesAuditHelperParams;
    // If there are no objects, we at least want to add a single audit log for the action
    const toAudit = !!objects && objects?.length > 0 ? objects : ([undefined] as undefined[]);
    for (const obj of toAudit) {
      this.addAuditEvent({
        action,
        ...(!!obj && { savedObject: { type: obj.type, id: obj.id } }),
        error,
        // By default, if authorization was a success the outcome is 'unknown' because the operation has not occurred yet
        // The GET action is one of the few exceptions to this, and hence it passes true to useSuccessOutcome
        ...(!error && { outcome: useSuccessOutcome ? 'success' : 'unknown' }),
        addToSpaces,
        deleteFromSpaces,
      });
    }
  }

  enforceAuthorization<A extends string>(params: EnforceAuthorizationParams<A>): void {
    const { typesAndSpaces, action, typeMap, auditOptions } = params;
    const {
      objects: auditObjects,
      bypassOnSuccess: bypassAuditOnSuccess,
      bypassOnFailure: bypassAuditOnFailure,
      useSuccessOutcome,
      addToSpaces,
      deleteFromSpaces,
    } = (auditOptions as UpdateSpacesAuditOptions) ?? {};

    const { authzAction, auditAction } = this.decodeSecurityAction(action);

    const unauthorizedTypes = new Set<string>();

    if (authzAction) {
      for (const [type, spaces] of typesAndSpaces) {
        const spacesArray = [...spaces];
        if (!isAuthorizedInAllSpaces(type, authzAction as A, spacesArray, typeMap)) {
          unauthorizedTypes.add(type);
        }
      }
    }

    if (unauthorizedTypes.size > 0) {
      const targetTypes = [...unauthorizedTypes].sort().join(',');
      const msg = `Unable to ${authzAction} ${targetTypes}`;
      const error = this.errors.decorateForbiddenError(new Error(msg));
      if (auditAction && !bypassAuditOnFailure) {
        this.auditHelper({
          action: auditAction,
          objects: auditObjects,
          useSuccessOutcome,
          addToSpaces,
          deleteFromSpaces,
          error,
        });
      }
      throw error;
    }

    if (auditAction && !bypassAuditOnSuccess) {
      this.auditHelper({ action: auditAction, objects: auditObjects, useSuccessOutcome });
    }
  }

  async authorize<A extends string>(
    params: PerformAuthorizationParams<A>
  ): Promise<CheckAuthorizationResult<A> | undefined> {
    if (params.actions.size === 0) {
      throw new Error('No actions specified for authorization');
    }
    if (params.types.size === 0) {
      throw new Error('No types specified for authorization');
    }
    if (params.spaces.has('')) params.spaces.delete('');
    if (params.spaces.size === 0) {
      throw new Error('No spaces specified for authorization');
    }

    const { authzActions, auditActions } = this.translateActions(params.actions);

    const {
      objects: auditObjects,
      bypassOnSuccess: bypassAuditOnSuccess,
      useSuccessOutcome,
    } = params.auditOptions || {};

    // If there are no actions to authorize then we can just add any audits for the sec actions
    // Example: SecurityAction.CLOSE_POINT_IN_TIME does not need authz, but we want an audit trail
    if (authzActions.size === 0) {
      if (!bypassAuditOnSuccess && auditActions.size > 0) {
        auditActions.forEach((auditAction) => {
          this.auditHelper({ action: auditAction, objects: auditObjects, useSuccessOutcome });
        });
      }
      return;
    }

    // console.log(`CHECKING...`);
    // console.log(`TYPES: ${Array.from(params.types).toString()}`);
    // console.log(`SPACES: ${Array.from(params.spaces).toString()}`);
    const checkResult: CheckAuthorizationResult<string> = await this.checkAuthorization({
      types: params.types,
      spaces: params.spaces,
      actions: authzActions,
      options: { allowGlobalResource: params.options?.allowGlobalResource === true },
    });

    // AuthorizationTypeMap<A extends string> = Map<string, Record<A, AuthorizationTypeEntry>>;
    // console.log(`CHECK RESULT TYPEMAP...`);
    // Array.from(checkResult.typeMap.keys()).forEach((key) => {
    //   const value = checkResult.typeMap.get(key);
    //   if (value !== undefined) {
    //     console.log(`TYPE: ${key}, Auth Entry: ${JSON.stringify(value)}`);
    //   }
    // });

    const typesAndSpaces = params.enforceMap;
    if (typesAndSpaces !== undefined && checkResult) {
      params.actions.forEach((action) => {
        // console.log(`ENFORCING...`);
        // Array.from(typesAndSpaces.keys()).forEach((key) => {
        //   console.log(`TYPE: ${key}, SPACES: ${Array.from(typesAndSpaces.get(key)!).toString()}`);
        // });
        this.enforceAuthorization({
          typesAndSpaces,
          action,
          typeMap: checkResult.typeMap,
          auditOptions: params.auditOptions,
        });
      });
    }

    return checkResult;
  }

  addAuditEvent(params: AddAuditEventParams): void {
    if (this.auditLogger.enabled) {
      const auditEvent = savedObjectEvent(params);
      this.auditLogger.log(auditEvent);
    }
  }

  redactNamespaces<T, A extends string>(params: RedactNamespacesParams<T, A>): SavedObject<T> {
    const { savedObject, typeMap } = params;
    const loginAction = this.actions.login as A; // This typeMap came from the `checkAuthorization` function, which always checks privileges for the "login" action (in addition to what the consumer requested)
    const actionRecord = typeMap.get(savedObject.type);
    const entry: AuthorizationTypeEntry = actionRecord?.[loginAction] ?? { authorizedSpaces: [] }; // fail-secure if attribute is not defined
    const { authorizedSpaces, isGloballyAuthorized } = entry;

    if (isGloballyAuthorized || !savedObject.namespaces?.length) {
      return savedObject;
    }
    const authorizedSpacesSet = new Set(authorizedSpaces);
    const redactedSpaces = savedObject.namespaces
      ?.map((x) => (x === ALL_SPACES_ID || authorizedSpacesSet.has(x) ? x : UNKNOWN_SPACE))
      .sort(namespaceComparator);
    return { ...savedObject, namespaces: redactedSpaces };
  }

  private async checkPrivileges(
    actions: string | string[],
    namespaceOrNamespaces?: string | Array<undefined | string>
  ) {
    try {
      return await this.checkPrivilegesFunc(actions, namespaceOrNamespaces);
    } catch (error) {
      throw this.errors.decorateGeneralError(error, error.body && error.body.reason);
    }
  }

  async authorizeCreate(
    params: AuthorizeCreateParams
  ): Promise<CheckAuthorizationResult<string> | undefined> {
    return this.internalAuthorizeCreate({
      namespaceString: params.namespaceString,
      objects: [params.object],
    });
  }

  async authorizeBulkCreate(
    params: AuthorizeBulkCreateParams
  ): Promise<CheckAuthorizationResult<string> | undefined> {
    return this.internalAuthorizeCreate(params, { forceBulkAction: true });
  }

  private async internalAuthorizeCreate(
    params: AuthorizeBulkCreateParams,
    options?: InternalAuthorizeOptions
  ): Promise<CheckAuthorizationResult<string> | undefined> {
    const { namespaceString, objects } = params;

    const action =
      options?.forceBulkAction || objects.length > 1
        ? SecurityAction.BULK_CREATE
        : SecurityAction.CREATE;

    if (objects.length === 0) {
      throw new Error(
        `No objects specified for ${
          this.actionMap.get(action)?.authzAction ?? 'unknown'
        } authorization`
      );
    }

    const enforceMap = new Map<string, Set<string>>();
    const spacesToAuthorize = new Set<string>([namespaceString]); // Always check authZ for the active space

    for (const obj of objects) {
      const spacesToEnforce = enforceMap.get(obj.type) ?? new Set([namespaceString]); // Always enforce authZ for the active space
      for (const space of obj.initialNamespaces ?? []) {
        spacesToEnforce.add(space);
        spacesToAuthorize.add(space);
      }
      enforceMap.set(obj.type, spacesToEnforce);

      for (const space of obj.existingNamespaces ?? []) {
        if (space === ALL_NAMESPACES_STRING) continue; // Don't accidentally check for global privileges when the object exists in '*'
        spacesToAuthorize.add(space); // existing namespaces are included so we can later redact if necessary
      }
    }

    const authorizationResult = await this.authorize({
      actions: new Set([action]),
      types: new Set(enforceMap.keys()),
      spaces: spacesToAuthorize,
      enforceMap,
      options: { allowGlobalResource: true },
      auditOptions: { objects },
    });

    return authorizationResult;
  }

  async authorizeUpdate(
    params: AuthorizeUpdateParams
  ): Promise<CheckAuthorizationResult<string> | undefined> {
    return this.internalAuthorizeUpdate({
      namespaceString: params.namespaceString,
      objects: [params.object],
    });
  }

  async authorizeBulkUpdate(
    params: AuthorizeBulkUpdateParams
  ): Promise<CheckAuthorizationResult<string> | undefined> {
    return this.internalAuthorizeUpdate(params, { forceBulkAction: true });
  }

  async internalAuthorizeUpdate(
    params: AuthorizeBulkUpdateParams,
    options?: InternalAuthorizeOptions
  ): Promise<CheckAuthorizationResult<string> | undefined> {
    const { namespaceString, objects } = params;

    const action =
      options?.forceBulkAction || objects.length > 1
        ? SecurityAction.BULK_UPDATE
        : SecurityAction.UPDATE;

    if (objects.length === 0) {
      throw new Error(
        `No objects specified for ${
          this.actionMap.get(action)?.authzAction ?? 'unknown'
        } authorization`
      );
    }

    const enforceMap = new Map<string, Set<string>>();
    const spacesToAuthorize = new Set<string>([namespaceString]); // Always check authZ for the active space

    for (const obj of objects) {
      const {
        type,
        objectNamespace: objectNamespace,
        existingNamespaces: existingNamespaces,
      } = obj;
      const objectNamespaceString = objectNamespace ?? namespaceString;

      const spacesToEnforce = enforceMap.get(type) ?? new Set([namespaceString]); // Always enforce authZ for the active space
      spacesToEnforce.add(objectNamespaceString);
      enforceMap.set(type, spacesToEnforce);
      spacesToAuthorize.add(objectNamespaceString);

      for (const space of existingNamespaces ?? []) {
        spacesToAuthorize.add(space); // existing namespaces are included so we can later redact if necessary
      }
    }

    const authorizationResult = await this.authorize({
      actions: new Set([action]),
      types: new Set(enforceMap.keys()),
      spaces: spacesToAuthorize,
      enforceMap,
      auditOptions: { objects },
    });

    return authorizationResult;
  }

  /**
   * Checks/enforces authorization, writes audit events, filters the object graph, and redacts spaces from the share_to_space/bulk_get
   * response. In other SavedObjectsRepository functions we do this before decrypting attributes. However, because of the
   * share_to_space/bulk_get response logic involved in deciding between the exact match or alias match, it's cleaner to do authorization,
   * auditing, filtering, and redaction all afterwards.
   */
  async authorizeAndRedactMultiNamespaceReferences(
    params: AuthorizeAndRedactMultiNamespaceReferencesParams
  ): Promise<SavedObjectReferenceWithContext[]> {
    const { namespaceString, objects, options = {} } = params;
    if (objects.length === 0) return objects;
    const { purpose } = options;

    // Check authorization based on all *found* object types / spaces
    const typesToAuthorize = new Set<string>();
    const spacesToAuthorize = new Set<string>([namespaceString]);
    const addSpacesToAuthorize = (spaces: string[] = []) => {
      for (const space of spaces) spacesToAuthorize.add(space);
    };
    for (const obj of objects) {
      typesToAuthorize.add(obj.type);
      addSpacesToAuthorize(obj.spaces);
      addSpacesToAuthorize(obj.spacesWithMatchingAliases);
      addSpacesToAuthorize(obj.spacesWithMatchingOrigins);
    }
    // const action =
    //   purpose === 'updateObjectsSpaces' ? ('share_to_space' as const) : ('bulk_get' as const);
    const action =
      purpose === 'updateObjectsSpaces'
        ? SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES_UPDATE_SPACES
        : SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES;

    // Enforce authorization based on all *requested* object types and the current space
    const typesAndSpaces = objects.reduce(
      (acc, { type }) => (acc.has(type) ? acc : acc.set(type, new Set([namespaceString]))), // Always enforce authZ for the active space
      new Map<string, Set<string>>()
    );

    const { typeMap } = (await this.authorize({
      actions: new Set([action]),
      types: typesToAuthorize,
      spaces: spacesToAuthorize,
      enforceMap: typesAndSpaces,
      auditOptions: { bypassOnSuccess: true }, // We will audit success results below, after redaction
    })) ?? { typeMap: new Map() };

    // Now, filter/redact the results. Most SOR functions just redact the `namespaces` field from each returned object. However, this function
    // will actually filter the returned object graph itself.
    // This is done in two steps: (1) objects which the user can't access *in this space* are filtered from the graph, and the
    // graph is rearranged to avoid leaking information. (2) any spaces that the user can't access are redacted from each individual object.
    // After we finish filtering, we can write audit events for each object that is going to be returned to the user.
    const requestedObjectsSet = objects.reduce(
      (acc, { type, id }) => acc.add(`${type}:${id}`),
      new Set<string>()
    );
    const retrievedObjectsSet = objects.reduce(
      (acc, { type, id }) => acc.add(`${type}:${id}`),
      new Set<string>()
    );
    const traversedObjects = new Set<string>();
    const filteredObjectsMap = new Map<string, SavedObjectReferenceWithContext>();
    const getIsAuthorizedForInboundReference = (inbound: { type: string; id: string }) => {
      const found = filteredObjectsMap.get(`${inbound.type}:${inbound.id}`);
      return found && !found.isMissing; // If true, this object can be linked back to one of the requested objects
    };
    let objectsToProcess = [...objects];
    while (objectsToProcess.length > 0) {
      const obj = objectsToProcess.shift()!;
      const { type, id, spaces, inboundReferences } = obj;
      const objKey = `${type}:${id}`;
      traversedObjects.add(objKey);
      // Is the user authorized to access this object in this space?
      let isAuthorizedForObject = true;
      try {
        this.enforceAuthorization({
          typesAndSpaces: new Map([[type, new Set([namespaceString])]]),
          action,
          typeMap,
          auditOptions: { bypassOnSuccess: true, bypassOnFailure: true }, // never audit here
        });
      } catch (err) {
        isAuthorizedForObject = false;
      }
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
          // Only generate success audit records for "non-empty results" with 1+ spaces
          // ("empty result" means the object was a non-multi-namespace type, or hidden type, or not found)
          // ToDo: this is one of the remaining calls to addAuditEvent outside of the security extension
          // This is a bit complicated to change now, but can ultimately be removed when authz logic is
          // migrated from the repo level to the extension level.
          this.addAuditEvent({
            action: AuditAction.COLLECT_MULTINAMESPACE_REFERENCES,
            savedObject: { type, id },
          });
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

    const filteredAndRedactedObjects = [
      ...filteredObjectsMap.values(),
    ].map<SavedObjectReferenceWithContext>((obj) => {
      const {
        type,
        id,
        spaces,
        spacesWithMatchingAliases,
        spacesWithMatchingOrigins,
        inboundReferences,
      } = obj;
      // Redact the inbound references so we don't leak any info about other objects that the user is not authorized to access
      const redactedInboundReferences = inboundReferences.filter((inbound) => {
        if (inbound.type === type && inbound.id === id) {
          // circular reference, don't redact it
          return true;
        }
        return getIsAuthorizedForInboundReference(inbound);
      });

      /** Simple wrapper for the `redactNamespaces` function that expects a saved object in its params. */
      const getRedactedSpaces = (spacesArray: string[] | undefined) => {
        if (!spacesArray) return;
        const savedObject = { type, namespaces: spacesArray } as SavedObject; // Other SavedObject attributes aren't required
        const result = this.redactNamespaces({ savedObject, typeMap });
        return result.namespaces;
      };
      const redactedSpaces = getRedactedSpaces(spaces)!;
      const redactedSpacesWithMatchingAliases = getRedactedSpaces(spacesWithMatchingAliases);
      const redactedSpacesWithMatchingOrigins = getRedactedSpaces(spacesWithMatchingOrigins);
      return {
        ...obj,
        spaces: redactedSpaces,
        ...(redactedSpacesWithMatchingAliases && {
          spacesWithMatchingAliases: redactedSpacesWithMatchingAliases,
        }),
        ...(redactedSpacesWithMatchingOrigins && {
          spacesWithMatchingOrigins: redactedSpacesWithMatchingOrigins,
        }),
        inboundReferences: redactedInboundReferences,
      };
    });

    return filteredAndRedactedObjects;
  }

  /**
   * Checks authorization, writes audit events, and redacts namespaces from the bulkResolve response. In other SavedObjectsRepository
   * functions we do this before decrypting attributes. However, because of the bulkResolve logic involved in deciding between the exact match
   * or alias match, it's cleaner to do authorization, auditing, and redaction all afterwards.
   */
  async authorizeAndRedactInternalBulkResolve<T = unknown>(
    params: AuthorizeAndRedactInternalBulkResolveParams<T>
  ): Promise<Array<SavedObjectsResolveResponse<T> | BulkResolveError>> {
    const { namespace, objects } = params;
    const namespaceString = SavedObjectsUtils.namespaceIdToString(namespace); // ToDo: prefer this methodology for other methods (as opposed to having to pass in the qualified namespaceString)?
    const typesAndSpaces = new Map<string, Set<string>>();
    const spacesToAuthorize = new Set<string>();
    const auditableObjects: Array<{ type: string; id: string }> = [];

    for (const result of objects) {
      let auditableObject: { type: string; id: string } | undefined;
      if (isBulkResolveError(result)) {
        const { type, id, error } = result;
        if (!SavedObjectsErrorHelpers.isBadRequestError(error)) {
          // Only "not found" errors should show up as audit events (not "unsupported type" errors)
          auditableObject = { type, id };
        }
      } else {
        const { type, id, namespaces = [] } = result.saved_object;
        auditableObject = { type, id };
        for (const space of namespaces) {
          spacesToAuthorize.add(space);
        }
      }
      if (auditableObject) {
        auditableObjects.push(auditableObject);
        const spacesToEnforce =
          typesAndSpaces.get(auditableObject.type) ?? new Set([namespaceString]); // Always enforce authZ for the active space
        spacesToEnforce.add(namespaceString);
        typesAndSpaces.set(auditableObject.type, spacesToEnforce);
        spacesToAuthorize.add(namespaceString);
      }
    }

    if (typesAndSpaces.size === 0) {
      // We only had "unsupported type" errors, there are no types to check privileges for, just return early
      return objects;
    }

    const { typeMap } = (await this.authorize({
      actions: new Set([SecurityAction.INTERNAL_BULK_RESOLVE]),
      types: new Set(typesAndSpaces.keys()),
      spaces: spacesToAuthorize,
      enforceMap: typesAndSpaces,
      auditOptions: { useSuccessOutcome: true },
    })) ?? { typeMap: new Map() }; // ToDo: Not sure if this is the best approach

    return objects.map((result) => {
      if (isBulkResolveError(result)) {
        return result;
      }
      return {
        ...result,
        saved_object: this.redactNamespaces({
          typeMap,
          savedObject: result.saved_object,
        }),
      };
    });
  }
}

/**
 * The '*' string is an identifier for All Spaces, but that is also the identifier for the Global Resource. We should not check
 * authorization against it unless explicitly specified, because you can only check privileges for the Global Resource *or* individual
 * resources (not both).
 */
function getAuthorizableSpaces(spaces: Set<string>, allowGlobalResource?: boolean) {
  const spacesArray = [...spaces];
  if (allowGlobalResource) return spacesArray;
  return spacesArray.filter((x) => x !== ALL_SPACES_ID);
}

function getMissingPrivileges(privileges: CheckPrivilegesResponse['privileges']) {
  return privileges.kibana.reduce<Map<string | undefined, Set<string>>>(
    (acc, { resource, privilege, authorized }) => {
      if (!authorized) {
        if (resource) {
          acc.set(resource, (acc.get(resource) || new Set()).add(privilege));
        }
        // Fail-secure: if a user is not authorized for a specific resource, they are not authorized for the global resource too (global resource is undefined)
        // The inverse is not true; if a user is not authorized for the global resource, they may still be authorized for a specific resource
        acc.set(undefined, (acc.get(undefined) || new Set()).add(privilege));
      }
      return acc;
    },
    new Map()
  );
}

/**
 * Utility function to sort potentially redacted namespaces.
 * Sorts in a case-insensitive manner, and ensures that redacted namespaces ('?') always show up at the end of the array.
 */
function namespaceComparator(a: string, b: string) {
  if (a === UNKNOWN_SPACE && b !== UNKNOWN_SPACE) {
    return 1;
  } else if (a !== UNKNOWN_SPACE && b === UNKNOWN_SPACE) {
    return -1;
  }
  const A = a.toUpperCase();
  const B = b.toUpperCase();
  return A > B ? 1 : A < B ? -1 : 0;
}
