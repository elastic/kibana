/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { Legacy } from 'kibana';
import { DEFAULT_SPACE_ID } from '../../../../../spaces/common/constants';
import { CheckPrivilegesWithRequest, CheckPrivilegesAtResourceResponse } from '../check_privileges';
import { Actions } from '../actions';

export type SavedObjectsOperation =
  | 'create'
  | 'update'
  | 'delete'
  | 'get'
  | 'bulk_get'
  | 'bulk_create'
  | 'find';

interface Deps {
  errors: {
    decorateGeneralError: (error: Error, reason: string) => Error;
    decorateForbiddenError: (error: Error) => Error;
  };
  spacesEnabled: boolean;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  request: Legacy.Request;
  actionsService: Actions;
  auditLogger: any;
}

export type EnsureSavedObjectsPrivileges = (
  typeOrTypes: string | string[] | undefined,
  operation: SavedObjectsOperation,
  namespace: string | undefined,
  args: any
) => Promise<void>;

export function ensureSavedObjectsPrivilegesFactory(deps: Deps) {
  const checkPrivileges = deps.checkPrivilegesWithRequest(deps.request);

  const { errors, spacesEnabled, actionsService, auditLogger } = deps;

  const ensureSavedObjectsPrivileges: EnsureSavedObjectsPrivileges = async (
    typeOrTypes: string | string[] | undefined,
    operation: SavedObjectsOperation,
    namespace: string | undefined,
    args: any
  ) => {
    const types = normalizeTypes(typeOrTypes);
    const actionsToTypesMap = new Map(
      types.map(type => [actionsService.savedObject.get(type, operation), type] as [string, string])
    );
    const actions = Array.from(actionsToTypesMap.keys());

    let privilegeResponse: CheckPrivilegesAtResourceResponse;

    try {
      if (spacesEnabled) {
        const spaceId = namespaceToSpaceId(namespace);
        privilegeResponse = await checkPrivileges.atSpace(spaceId, actions);
      } else {
        privilegeResponse = await checkPrivileges.globally(actions);
      }
    } catch (error) {
      const { reason } = get<Record<string, any>>(error, 'body.error', {});
      throw errors.decorateGeneralError(error, reason);
    }

    const { hasAllRequested, username, privileges } = privilegeResponse;
    if (hasAllRequested) {
      auditLogger.savedObjectsAuthorizationSuccess(username, operation, types, args);
    } else {
      const missingPrivileges = getMissingPrivileges(privileges);
      auditLogger.savedObjectsAuthorizationFailure(
        username,
        operation,
        types,
        missingPrivileges,
        args
      );

      const msg = `Unable to ${operation} ${missingPrivileges
        .map(privilege => actionsToTypesMap.get(privilege))
        .sort()
        .join(',')}`;
      throw errors.decorateForbiddenError(new Error(msg));
    }
  };

  return ensureSavedObjectsPrivileges;
}

function normalizeTypes(typeOrTypes: string | string[] | undefined): string[] {
  if (!typeOrTypes) {
    return [];
  }
  if (Array.isArray(typeOrTypes)) {
    return typeOrTypes;
  }
  return [typeOrTypes];
}

function namespaceToSpaceId(namespace: string | undefined) {
  if (namespace == null) {
    return DEFAULT_SPACE_ID;
  }
  return namespace;
}

function getMissingPrivileges(response: Record<string, boolean>): string[] {
  return Object.keys(response).filter(privilege => !response[privilege]);
}
