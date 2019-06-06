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

export type SavedObjectsAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'get'
  | 'bulk_get'
  | 'bulk_create'
  | 'find';

interface Deps {
  errors: any;
  spacesEnabled: boolean;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  request: Legacy.Request;
  actionsService: Actions;
  auditLogger: any;
}

export type CheckSavedObjectsPrivileges = (
  typeOrTypes: string | string[] | undefined,
  action: SavedObjectsAction,
  namespace: string | undefined,
  args: any
) => Promise<void>;

export function checkSavedObjectsPrivilegesFactory(deps: Deps) {
  const checkPrivileges = deps.checkPrivilegesWithRequest(deps.request);
  const checkSavedObjectsPrivileges: CheckSavedObjectsPrivileges = async (
    typeOrTypes: string | string[] | undefined,
    action: SavedObjectsAction,
    namespace: string | undefined,
    args: any
  ) => {
    const types = normalizeTypes(typeOrTypes);
    const actionsToTypesMap = new Map(
      types.map(type => [deps.actionsService.savedObject.get(type, action), type])
    );
    const actions = Array.from(actionsToTypesMap.keys());

    let privilegeResponse: CheckPrivilegesAtResourceResponse;

    try {
      if (deps.spacesEnabled) {
        const spaceId = namespaceToSpaceId(namespace);
        privilegeResponse = await checkPrivileges.atSpace(spaceId, actions);
      } else {
        privilegeResponse = await checkPrivileges.globally(actions);
      }
    } catch (error) {
      const { reason } = get<Record<string, any>>(error, 'body.error', {});
      throw deps.errors.decorateGeneralError(error, reason);
    }

    const { hasAllRequested, username, privileges } = privilegeResponse;
    if (hasAllRequested) {
      deps.auditLogger.savedObjectsAuthorizationSuccess(username, action, types, args);
    } else {
      const missingPrivileges = getMissingPrivileges(privileges);
      deps.auditLogger.savedObjectsAuthorizationFailure(
        username,
        action,
        types,
        missingPrivileges,
        args
      );

      const msg = `Unable to ${action} ${missingPrivileges
        .map(privilege => actionsToTypesMap.get(privilege))
        .sort()
        .join(',')}`;
      throw deps.errors.decorateForbiddenError(new Error(msg));
    }
  };

  return checkSavedObjectsPrivileges;
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
