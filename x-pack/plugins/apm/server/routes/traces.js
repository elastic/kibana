/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { setupRequest } from '../lib/helpers/setup_request';
import { withDefaultValidators } from '../lib/helpers/input_validation';
import { getTrace } from '../lib/traces/get_trace';
import { getTopTraces } from '../lib/traces/get_top_traces';

const pre = [{ method: setupRequest, assign: 'setup' }];
const ROOT = '/api/apm/traces';
const defaultErrorHandler = reply => err => {
  console.error(err.stack);
  reply(Boom.wrap(err, 400));
};

export function initTracesApi(server) {
  // Get trace list
  server.route({
    method: 'GET',
    path: ROOT,
    config: {
      pre,
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: (req, reply) => {
      const { setup } = req.pre;

      return getTopTraces({ setup })
        .then(reply)
        .catch(defaultErrorHandler(reply));
    }
  });

  // Get individual trace
  server.route({
    method: 'GET',
    path: `${ROOT}/{traceId}`,
    config: {
      pre,
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: (req, reply) => {
      const { traceId } = req.params;
      const { setup } = req.pre;
      return getTrace(traceId, setup)
        .then(reply)
        .catch(defaultErrorHandler(reply));
    }
  });
}
