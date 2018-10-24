/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Server } from 'hapi';
import { withDefaultValidators } from '../lib/helpers/input_validation';
import { setupRequest } from '../lib/helpers/setup_request';
import { getTopTraces } from '../lib/traces/get_top_traces';
import { getTrace } from '../lib/traces/get_trace';

const pre = [{ method: setupRequest, assign: 'setup' }];
const ROOT = '/api/apm/traces';
const defaultErrorHandler = (err: Error) => {
  // tslint:disable-next-line
  console.error(err.stack);
  // @ts-ignore
  return Boom.wrap(err, 400);
};

export function initTracesApi(server: Server) {
  // Get trace list
  server.route({
    method: 'GET',
    path: ROOT,
    options: {
      pre,
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: req => {
      const { setup } = req.pre;

      return getTopTraces(setup).catch(defaultErrorHandler);
    }
  });

  // Get individual trace
  server.route({
    method: 'GET',
    path: `${ROOT}/{traceId}`,
    options: {
      pre,
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: req => {
      const { traceId } = req.params;
      const { setup } = req.pre;
      return getTrace(traceId, setup).catch(defaultErrorHandler);
    }
  });
}
