/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CheckPrivilegesAtResourceResponse, CheckPrivilegesWithRequest } from './check_privileges';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesPlugin } from '../../../../spaces/types';
import { OptionalPlugin } from '../optional_plugin';

export type CheckPrivilegesDynamically = (
  privilegeOrPrivileges: string | string[]
) => Promise<CheckPrivilegesAtResourceResponse>;

export type CheckPrivilegesDynamicallyWithRequest = (
  request: Record<string, any>
) => CheckPrivilegesDynamically;

export function checkPrivilegesDynamicallyWithRequestFactory(
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest,
  spaces: OptionalPlugin<SpacesPlugin>
): CheckPrivilegesDynamicallyWithRequest {
  return function checkPrivilegesDynamicallyWithRequest(request: Record<string, any>) {
    const checkPrivileges = checkPrivilegesWithRequest(request);
    return async function checkPrivilegesDynamically(privilegeOrPrivileges: string | string[]) {
      if (spaces.isEnabled) {
        const spaceId = spaces.getSpaceId(request);
        return await checkPrivileges.atSpace(spaceId, privilegeOrPrivileges);
      } else {
        return await checkPrivileges.globally(privilegeOrPrivileges);
      }
    };
  };
}
