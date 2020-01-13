/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from '../../../../../src/core/server';
import { SpacesService } from '../plugin';
import {
  CheckPrivilegesAtResourceResponse,
  CheckPrivilegesWithRequest,
  CheckPrivilegesAtSpacesResponse,
} from './check_privileges';

export type CheckSavedObjectsPrivilegesWithRequest = (
  request: KibanaRequest
) => CheckSavedObjectsPrivileges;

export interface CheckSavedObjectsPrivileges {
  dynamically: (
    actions: string | string[],
    namespace?: string
  ) => Promise<CheckPrivilegesAtResourceResponse>;
  atNamespaces: (
    actions: string | string[],
    namespaces: string[]
  ) => Promise<CheckPrivilegesAtSpacesResponse>;
}

export const checkSavedObjectsPrivilegesWithRequestFactory = (
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest,
  getSpacesService: () => SpacesService | undefined
): CheckSavedObjectsPrivilegesWithRequest => {
  return function checkSavedObjectsPrivilegesWithRequest(request: KibanaRequest) {
    return {
      async atNamespaces(actions: string | string[], namespaces: string[]) {
        const spacesService = getSpacesService();
        if (spacesService === undefined) {
          throw new Error(`Can't check saved object privileges at spaces if spaces is disabled`);
        }
        const spaceIds = namespaces.map(spacesService.namespaceToSpaceId);
        return await checkPrivilegesWithRequest(request).atSpaces(spaceIds, actions);
      },
      async dynamically(actions: string | string[], namespace?: string) {
        const spacesService = getSpacesService();
        return spacesService
          ? await checkPrivilegesWithRequest(request).atSpace(
              spacesService.namespaceToSpaceId(namespace),
              actions
            )
          : await checkPrivilegesWithRequest(request).globally(actions);
      },
    };
  };
};
