/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function checkPrivilegesDynamicallyWithRequestFactory(
  checkPrivilegesWithRequest: any,
  spaces: any
) {
  return function checkPrivilegesDynamicallyWithRequest(request: any) {
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
