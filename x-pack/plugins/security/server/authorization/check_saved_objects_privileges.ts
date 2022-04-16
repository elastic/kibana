/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import { ALL_SPACES_ID } from '../../common/constants';
import type { SpacesService } from '../plugin';
import type { CheckPrivilegesResponse, CheckPrivilegesWithRequest } from './types';

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
      const privileges = { kibana: actions };

      if (spacesService) {
        if (Array.isArray(namespaceOrNamespaces)) {
          // Spaces enabled, authorizing against multiple spaces
          if (!namespaceOrNamespaces.length) {
            throw new Error(`Can't check saved object privileges for 0 namespaces`);
          }
          const spaceIds = uniq(
            namespaceOrNamespaces.map((x) => spacesService.namespaceToSpaceId(x))
          );

          if (!spaceIds.includes(ALL_SPACES_ID)) {
            return await checkPrivilegesWithRequest(request).atSpaces(spaceIds, privileges);
          }
        } else {
          // Spaces enabled, authorizing against a single space
          const spaceId = spacesService.namespaceToSpaceId(namespaceOrNamespaces);
          if (spaceId !== ALL_SPACES_ID) {
            return await checkPrivilegesWithRequest(request).atSpace(spaceId, privileges);
          }
        }
      }

      // Spaces plugin is disabled OR we are checking privileges for "all spaces", authorizing globally
      return await checkPrivilegesWithRequest(request).globally(privileges);
    };
  };
};
