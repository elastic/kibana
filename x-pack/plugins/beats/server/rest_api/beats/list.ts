/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapEsError } from '../../utils/error_wrappers';

export const createListAgentsRoute = libs => ({
  handler: async (request, reply) => {
    try {
      reply(await libs.beats.getAllBeats());
    } catch (err) {
      // TODO move this to kibana route thing in adapter
      return reply(wrapEsError(err));
    }
  },
  method: 'GET',
  path: '/api/beats/agents',
});
