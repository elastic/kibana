/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClient } from '@kbn/core-saved-objects-api-server-internal';
import type { SavedObject } from '@kbn/core-saved-objects-common';
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

  constructor({ actions, auditLogger, errors, checkPrivileges }: Params) {
    this.actions = actions;
    this.auditLogger = auditLogger;
    this.errors = errors;
    this.checkPrivilegesFunc = checkPrivileges;
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
          action = entry.action;
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

  enforceAuthorization<A extends string>(params: EnforceAuthorizationParams<A>): void {
    const { typesAndSpaces, action, typeMap, auditCallback } = params;
    const unauthorizedTypes = new Set<string>();
    for (const [type, spaces] of typesAndSpaces) {
      const spacesArray = [...spaces];
      if (!isAuthorizedInAllSpaces(type, action, spacesArray, typeMap)) {
        unauthorizedTypes.add(type);
      }
    }

    if (unauthorizedTypes.size > 0) {
      const targetTypes = [...unauthorizedTypes].sort().join(',');
      const msg = `Unable to ${action} ${targetTypes}`;
      const error = this.errors.decorateForbiddenError(new Error(msg));
      auditCallback?.(error);
      throw error;
    }
    auditCallback?.();
  }

  async performAuthorization<A extends string>(
    params: PerformAuthorizationParams<A>
  ): Promise<CheckAuthorizationResult<A>> {
    const checkResult: CheckAuthorizationResult<A> = await this.checkAuthorization({
      types: params.types,
      spaces: params.spaces,
      actions: params.actions,
      options: { allowGlobalResource: params.options?.allowGlobalResource === true },
    });

    const typesAndSpaces = params.enforceMap;
    if (typesAndSpaces !== undefined && checkResult) {
      params.actions.forEach((action) => {
        this.enforceAuthorization({
          typesAndSpaces,
          action,
          typeMap: checkResult.typeMap,
          auditCallback: params.auditCallback,
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
