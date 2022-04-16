/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { Actions, CheckSavedObjectsPrivileges } from '../authorization';
import type { CheckPrivilegesResponse } from '../authorization/types';

export interface EnsureAuthorizedDependencies {
  actions: Actions;
  errors: SavedObjectsClientContract['errors'];
  checkSavedObjectsPrivilegesAsCurrentUser: CheckSavedObjectsPrivileges;
}

export interface EnsureAuthorizedOptions {
  /** Whether or not to throw an error if the user is not fully authorized. Default is true. */
  requireFullAuthorization?: boolean;
}

export interface EnsureAuthorizedResult<T extends string> {
  status: 'fully_authorized' | 'partially_authorized' | 'unauthorized';
  typeActionMap: Map<string, Record<T, EnsureAuthorizedActionResult>>;
}

export interface EnsureAuthorizedActionResult {
  authorizedSpaces: string[];
  isGloballyAuthorized?: boolean;
}

/**
 * Checks to ensure a user is authorized to access object types in given spaces.
 *
 * @param {EnsureAuthorizedDependencies} deps the dependencies needed to make the privilege checks.
 * @param {string[]} types the type(s) to check privileges for.
 * @param {T[]} actions the action(s) to check privileges for.
 * @param {string[]} spaceIds the id(s) of spaces to check privileges for.
 * @param {EnsureAuthorizedOptions} options the options to use.
 */
export async function ensureAuthorized<T extends string>(
  deps: EnsureAuthorizedDependencies,
  types: string[],
  actions: T[],
  spaceIds: string[],
  options: EnsureAuthorizedOptions = {}
): Promise<EnsureAuthorizedResult<T>> {
  const { requireFullAuthorization = true } = options;
  const privilegeActionsMap = new Map(
    types.flatMap((type) =>
      actions.map((action) => [deps.actions.savedObject.get(type, action), { type, action }])
    )
  );
  const privilegeActions = Array.from(privilegeActionsMap.keys());
  const { hasAllRequested, privileges } = await checkPrivileges(deps, privilegeActions, spaceIds);

  const missingPrivileges = getMissingPrivileges(privileges);
  const typeActionMap = privileges.kibana.reduce<
    Map<string, Record<T, EnsureAuthorizedActionResult>>
  >((acc, { resource, privilege }) => {
    const missingPrivilegesAtResource =
      (resource && missingPrivileges.get(resource)?.has(privilege)) ||
      (!resource && missingPrivileges.get(undefined)?.has(privilege));

    if (missingPrivilegesAtResource) {
      return acc;
    }
    const { type, action } = privilegeActionsMap.get(privilege)!; // always defined
    const actionAuthorizations = acc.get(type) ?? ({} as Record<T, EnsureAuthorizedActionResult>);
    const authorization: EnsureAuthorizedActionResult = actionAuthorizations[action] ?? {
      authorizedSpaces: [],
    };

    if (resource === undefined) {
      return acc.set(type, {
        ...actionAuthorizations,
        [action]: { ...authorization, isGloballyAuthorized: true },
      });
    }

    return acc.set(type, {
      ...actionAuthorizations,
      [action]: {
        ...authorization,
        authorizedSpaces: authorization.authorizedSpaces.concat(resource),
      },
    });
  }, new Map());

  if (hasAllRequested) {
    return { typeActionMap, status: 'fully_authorized' };
  }

  if (!requireFullAuthorization) {
    const isPartiallyAuthorized = typeActionMap.size > 0;
    if (isPartiallyAuthorized) {
      return { typeActionMap, status: 'partially_authorized' };
    } else {
      return { typeActionMap, status: 'unauthorized' };
    }
  }

  // Neither fully nor partially authorized. Bail with error.
  const uniqueUnauthorizedPrivileges = [...missingPrivileges.entries()].reduce(
    (acc, [, privilegeSet]) => new Set([...acc, ...privilegeSet]),
    new Set<string>()
  );
  const targetTypesAndActions = [...uniqueUnauthorizedPrivileges]
    .map((privilege) => {
      const { type, action } = privilegeActionsMap.get(privilege)!;
      return `(${action} ${type})`;
    })
    .sort()
    .join(',');
  const msg = `Unable to ${targetTypesAndActions}`;
  throw deps.errors.decorateForbiddenError(new Error(msg));
}

/**
 * Helper function that, given an `EnsureAuthorizedResult`, checks to see what spaces the user is authorized to perform a given action for
 * the given object type.
 *
 * @param {string} objectType the object type to check.
 * @param {T} action the action to check.
 * @param {EnsureAuthorizedResult<T>['typeActionMap']} typeActionMap the typeActionMap from an EnsureAuthorizedResult.
 */
export function getEnsureAuthorizedActionResult<T extends string>(
  objectType: string,
  action: T,
  typeActionMap: EnsureAuthorizedResult<T>['typeActionMap']
): EnsureAuthorizedActionResult {
  const record = typeActionMap.get(objectType) ?? ({} as Record<T, EnsureAuthorizedActionResult>);
  return record[action] ?? { authorizedSpaces: [] };
}

/**
 * Helper function that, given an `EnsureAuthorizedResult`, ensures that the user is authorized to perform a given action for the given
 * object type in the given spaces.
 *
 * @param {string} objectType the object type to check.
 * @param {T} action the action to check.
 * @param {EnsureAuthorizedResult<T>['typeActionMap']} typeActionMap the typeActionMap from an EnsureAuthorizedResult.
 * @param {string[]} spacesToAuthorizeFor the spaces to check.
 */
export function isAuthorizedForObjectInAllSpaces<T extends string>(
  objectType: string,
  action: T,
  typeActionMap: EnsureAuthorizedResult<T>['typeActionMap'],
  spacesToAuthorizeFor: string[]
) {
  const actionResult = getEnsureAuthorizedActionResult(objectType, action, typeActionMap);
  const { authorizedSpaces, isGloballyAuthorized } = actionResult;
  const authorizedSpacesSet = new Set(authorizedSpaces);
  return (
    isGloballyAuthorized || spacesToAuthorizeFor.every((space) => authorizedSpacesSet.has(space))
  );
}

async function checkPrivileges(
  deps: EnsureAuthorizedDependencies,
  actions: string | string[],
  namespaceOrNamespaces?: string | Array<undefined | string>
) {
  try {
    return await deps.checkSavedObjectsPrivilegesAsCurrentUser(actions, namespaceOrNamespaces);
  } catch (error) {
    throw deps.errors.decorateGeneralError(error, error.body && error.body.reason);
  }
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
