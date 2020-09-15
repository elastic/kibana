/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from '../../../../../src/core/server';
import { SpacesService } from '../plugin';
import { CheckPrivilegesWithRequest, CheckPrivilegesResponse } from './types';

export type CheckSavedObjectsPrivilegesWithRequest = (
  request: KibanaRequest
) => CheckSavedObjectsPrivileges;

export type CheckSavedObjectsPrivileges = (
  actions: string | string[],
  namespaceOrNamespaces?: string | Array<undefined | string>
) => Promise<CheckPrivilegesResponse>;

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set<T>(arr));
}

export const checkSavedObjectsPrivilegesWithRequestFactory = (
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest,
  getSpacesService: () => SpacesService | undefined
): CheckSavedObjectsPrivilegesWithRequest => {
  return function checkSavedObjectsPrivilegesWithRequest(
    request: KibanaRequest
  ): CheckSavedObjectsPrivileges {
    return async function checkSavedObjectsPrivileges(
      actions: string | string[],
      namespaceOrNamespaces?: string | Array<undefined | string>
    ) {
      const spacesService = getSpacesService();
      if (!spacesService) {
        // Spaces disabled, authorizing globally
        return await checkPrivilegesWithRequest(request).globally({ kibana: actions });
      } else if (Array.isArray(namespaceOrNamespaces)) {
        // Spaces enabled, authorizing against multiple spaces
        if (!namespaceOrNamespaces.length) {
          throw new Error(`Can't check saved object privileges for 0 namespaces`);
        }
        const spaceIds = uniq(
          namespaceOrNamespaces.map((x) => spacesService.namespaceToSpaceId(x))
        );

        return await checkPrivilegesWithRequest(request).atSpaces(spaceIds, { kibana: actions });
      } else {
        // Spaces enabled, authorizing against a single space
        const spaceId = spacesService.namespaceToSpaceId(namespaceOrNamespaces);
        return await checkPrivilegesWithRequest(request).atSpace(spaceId, { kibana: actions });
      }
    };
  };
};
