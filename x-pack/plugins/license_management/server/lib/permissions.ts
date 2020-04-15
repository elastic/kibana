/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallAsCurrentUser } from '../types';

interface GetPermissionsArg {
  isSecurityEnabled: boolean;
  callAsCurrentUser: CallAsCurrentUser;
}

export async function getPermissions({ isSecurityEnabled, callAsCurrentUser }: GetPermissionsArg) {
  if (!isSecurityEnabled) {
    // If security isn't enabled, let the user use license management
    return {
      hasPermission: true,
    };
  }

  const options = {
    method: 'POST',
    path: '/_security/user/_has_privileges',
    body: {
      cluster: ['manage'], // License management requires "manage" cluster privileges
    },
  };

  try {
    const response = await callAsCurrentUser('transport.request', options);
    return {
      hasPermission: response.cluster.manage,
    };
  } catch (error) {
    return error.body;
  }
}
