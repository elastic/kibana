/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HBServerLibs } from '../../lib/lib';

export const createGetAllRoute = (libs: HBServerLibs) => ({
  method: 'GET',
  path: '/api/heartbeat/monitors',
  handler: async (request: any) => {
    return await libs.monitors.getAll(request);
  },
});
