/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from 'src/core/server';

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

export async function ensureAuthorized<T extends string>(
  deps: EnsureAuthorizedDependencies,
  types: string[],
  actions: string[],
  namespaces: string[],
  options: EnsureAuthorizedOptions = {}
): Promise<EnsureAuthorizedResult<T>> {
  const { requireFullAuthorization = true } = options;
  const privilegeActionsMap = new Map(
    types.flatMap((type) =>
      actions.map((action) => [deps.actions.savedObject.get(type, action), { type, action }])
    )
  );
  const privilegeActions = Array.from(privilegeActionsMap.keys());
  const { hasAllRequested, privileges } = await checkPrivileges(deps, privilegeActions, namespaces);

  const missingPrivileges = getMissingPrivileges(privileges);
  const typeActionMap = privileges.kibana.reduce<
    Map<string, Record<T, EnsureAuthorizedActionResult>>
  >((acc, { resource, privilege, authorized }) => {
    if (!authorized) {
      return acc;
    }
    const { type, action } = privilegeActionsMap.get(privilege)!; // always defined
    const value = acc.get(type) ?? ({} as Record<T, EnsureAuthorizedActionResult>);
    const record: EnsureAuthorizedActionResult = value[action as T] ?? { authorizedSpaces: [] };
    if (resource === undefined) {
      return acc.set(type, { ...value, [action]: { ...record, isGloballyAuthorized: true } });
    }
    const authorizedSpaces = record.authorizedSpaces.concat(resource);
    return acc.set(type, { ...value, [action]: { ...record, authorizedSpaces } });
  }, new Map());

  if (hasAllRequested) {
    return { typeActionMap, status: 'fully_authorized' };
  } else if (!requireFullAuthorization) {
    const isPartiallyAuthorized = privileges.kibana.some(({ authorized }) => authorized);
    if (isPartiallyAuthorized) {
      return { typeActionMap, status: 'partially_authorized' };
    } else {
      return { typeActionMap, status: 'unauthorized' };
    }
  } else {
    const targetTypesAndActions = uniq(
      missingPrivileges
        .map(({ privilege }) => {
          const { type, action } = privilegeActionsMap.get(privilege)!;
          return `(${action} ${type})`;
        })
        .sort()
    ).join(',');
    const msg = `Unable to ${targetTypesAndActions}`;
    throw deps.errors.decorateForbiddenError(new Error(msg));
  }
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
  return privileges.kibana
    .filter(({ authorized }) => !authorized)
    .map(({ resource, privilege }) => ({ spaceId: resource, privilege }));
}

/**
 * Returns all unique elements of an array.
 */
function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set<T>(arr));
}
