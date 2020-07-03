/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createRoute } from './create_route';
import { getIndicesPrivileges } from '../lib/security/get_indices_privileges';

export const indicesPrivilegesRoute = createRoute(() => ({
  path: '/api/apm/security/indices_privileges',
  handler: async ({ context, request }) => {
    return getIndicesPrivileges({
      context,
      request,
    });
  },
}));
