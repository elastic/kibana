/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClient } from '@kbn/core-saved-objects-api-server-internal';
import type { SavedObject } from '@kbn/core-saved-objects-common';
import { AuditAction, SecurityAction } from '@kbn/core-saved-objects-server';
import type {
  AddAuditEventParams,
  AuthorizationTypeEntry,
  AuthorizationTypeMap,
  CheckAuthorizationParams,
  CheckAuthorizationResult,
  EnforceAuthorizationParams,
  ISavedObjectsSecurityExtension,
  PerformAuthorizationParams,
  RedactNamespacesParams,
} from '@kbn/core-saved-objects-server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';

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

  private auditHelper(
    action: AuditAction,
    objects?: Array<{ type: string; id: string }>,
    useSuccessOutcome: boolean = false,
    addToSpaces?: string[],
    deleteFromSpaces?: string[],
    error?: Error
  ) {
    if (objects && objects?.length > 0) {
      for (const obj of objects) {
        this.addAuditEvent({
          action,
          savedObject: { type: obj.type, id: obj.id },
          error,
          // By default, if authorization was a success the outcome is 'unknown' because the operation has not occurred yet
          // The GET action is one of the few exceptions to this, and hence it passes true to useSuccessOutcome
          ...(!error && { outcome: useSuccessOutcome ? 'success' : 'unknown' }),
          addToSpaces,
          deleteFromSpaces,
        });
      }
    } else {
      this.addAuditEvent({
        action,
        error,
        // outcome: error ? 'failure' : useSuccessOutcome ? 'success' : 'unknown',
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
    } = auditOptions ?? {};

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
        this.auditHelper(
          auditAction,
          auditObjects,
          useSuccessOutcome,
          addToSpaces,
          deleteFromSpaces,
          error
        );
      }
      throw error;
    }

    if (auditAction && !bypassAuditOnSuccess) {
      this.auditHelper(auditAction, auditObjects, useSuccessOutcome);
    }
  }

  async performAuthorization<A extends string>(
    params: PerformAuthorizationParams<A>
  ): Promise<CheckAuthorizationResult<A> | undefined> {
    if (params.actions.size === 0) {
      throw new Error('No actions specified for authorization check');
    }
    const { authzActions, auditActions } = this.translateActions(params.actions);

    const {
      objects: auditObjects,
      bypassOnSuccess: bypassAuditOnSuccess,
      useSuccessOutcome,
    } = params.auditOptions || {};

    // If there are no actions to authorize then we can just add any audits for the sec actions
    // Example: SecurityAction.CLOSE_POINT_IN_TIME does not need authz, but we want an audit trail
    if (authzActions.size <= 0) {
      if (!bypassAuditOnSuccess && auditActions.size > 0) {
        auditActions.forEach((auditAction) => {
          this.auditHelper(auditAction, auditObjects, useSuccessOutcome);
        });
      }
      return undefined;
    }

    const checkResult: CheckAuthorizationResult<string> = await this.checkAuthorization({
      types: params.types,
      spaces: params.spaces,
      actions: authzActions,
      options: { allowGlobalResource: params.options?.allowGlobalResource === true },
    });

    const typesAndSpaces = params.enforceMap;
    if (typesAndSpaces !== undefined && checkResult) {
      params.actions.forEach((action) => {
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

  async authorizeCreate(params: {
    action: SecurityAction.CREATE | SecurityAction.BULK_CREATE;
    namespaceString: string;
    objects: Array<{
      type: string;
      id: string;
      initialNamespaces: string[] | undefined;
      existingNamespaces: string[] | undefined;
    }>;
  }): Promise<CheckAuthorizationResult<string> | undefined> {
    const { action, namespaceString, objects } = params;

    //  const action = objects.length > 1 ? SecurityAction.BULK_CREATE : SecurityAction.CREATE;
    const typesAndSpaces = new Map<string, Set<string>>();
    const spacesToAuthorize = new Set<string>([namespaceString]); // Always check authZ for the active space

    for (const obj of objects) {
      const spacesToEnforce = typesAndSpaces.get(obj.type) ?? new Set([namespaceString]); // Always enforce authZ for the active space
      for (const space of obj.initialNamespaces ?? []) {
        spacesToEnforce.add(space);
        spacesToAuthorize.add(space);
      }
      typesAndSpaces.set(obj.type, spacesToEnforce);

      for (const space of obj.existingNamespaces ?? []) {
        if (space === ALL_NAMESPACES_STRING) continue; // Don't accidentally check for global privileges when the object exists in '*'
        spacesToAuthorize.add(space); // existing namespaces are included so we can later redact if necessary
      }
    }
    spacesToAuthorize.delete(ALL_NAMESPACES_STRING); // Don't accidentally check for global privileges when the object exists in '*'

    const returnVal = await this.performAuthorization({
      actions: new Set([action]),
      types: new Set(typesAndSpaces.keys()),
      spaces: spacesToAuthorize,
      enforceMap: typesAndSpaces,
      options: { allowGlobalResource: true },
      auditOptions: { objects },
    });

    return returnVal;
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
