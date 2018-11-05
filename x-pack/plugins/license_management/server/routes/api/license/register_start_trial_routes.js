/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { canStartTrial, startTrial } from '../../../lib/start_trial';
import { wrapEsError } from '../../../lib/wrap_es_error';

export function registerStartTrialRoutes(server) {
  const xpackInfo = server.plugins.xpack_main.info;
  server.route({
    path: '/api/license/start_trial',
    method: 'GET',
    handler: (request) => {
      return canStartTrial(request)
        .catch(e => wrapEsError(e));
    }
  });
  server.route({
    path: '/api/license/start_trial',
    method: 'POST',
    handler: (request) => {
      return startTrial(request, xpackInfo)
        .catch(e => wrapEsError(e));
    }
  });
}
