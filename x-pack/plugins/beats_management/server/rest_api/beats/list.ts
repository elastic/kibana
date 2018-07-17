/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/lib';
import { wrapEsError } from '../../utils/error_wrappers';

// TODO: add license check pre-hook
export const createListAgentsRoute = (libs: CMServerLibs) => ({
  handler: async (request: FrameworkRequest, reply: any) => {
    try {
      const beats = await libs.beats.getAllBeats(request.user);
      reply({ beats });
    } catch (err) {
      // TODO move this to kibana route thing in adapter
      return reply(wrapEsError(err));
    }
  },
  method: 'GET',
  path: '/api/beats/agents',
});
