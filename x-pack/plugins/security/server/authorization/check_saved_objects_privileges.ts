/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from '../../../../../src/core/server';
import { SpacesService } from '../plugin';
import { CheckPrivilegesAtResourceResponse, CheckPrivilegesWithRequest } from './check_privileges';

export type CheckSavedObjectsPrivilegesWithRequest = (
  request: KibanaRequest
) => CheckSavedObjectsPrivileges;
export type CheckSavedObjectsPrivileges = (
  actions: string | string[],
  namespace?: string
) => Promise<CheckPrivilegesAtResourceResponse>;

export const checkSavedObjectsPrivilegesWithRequestFactory = (
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest,
  getSpacesService: () => SpacesService | undefined
): CheckSavedObjectsPrivilegesWithRequest => {
  return function checkSavedObjectsPrivilegesWithRequest(request: KibanaRequest) {
    return async function checkSavedObjectsPrivileges(
      actions: string | string[],
      namespace?: string
    ) {
      const spacesService = getSpacesService();
      return spacesService
        ? await checkPrivilegesWithRequest(request).atSpace(
            spacesService.namespaceToSpaceId(namespace),
            actions
          )
        : await checkPrivilegesWithRequest(request).globally(actions);
    };
  };
};
