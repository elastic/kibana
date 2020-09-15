/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from '../../../../../src/core/server';
import { SpacesService } from '../plugin';
import { CheckPrivilegesResponse, CheckPrivilegesWithRequest } from './types';
import { CheckPrivilegesPayload } from './types';

export type CheckPrivilegesDynamically = (
  privileges: CheckPrivilegesPayload
) => Promise<CheckPrivilegesResponse>;

export type CheckPrivilegesDynamicallyWithRequest = (
  request: KibanaRequest
) => CheckPrivilegesDynamically;

export function checkPrivilegesDynamicallyWithRequestFactory(
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest,
  getSpacesService: () => SpacesService | undefined
): CheckPrivilegesDynamicallyWithRequest {
  return function checkPrivilegesDynamicallyWithRequest(request: KibanaRequest) {
    const checkPrivileges = checkPrivilegesWithRequest(request);
    return async function checkPrivilegesDynamically(privileges: CheckPrivilegesPayload) {
      const spacesService = getSpacesService();
      return spacesService
        ? await checkPrivileges.atSpace(spacesService.getSpaceId(request), privileges)
        : await checkPrivileges.globally(privileges);
    };
  };
}
