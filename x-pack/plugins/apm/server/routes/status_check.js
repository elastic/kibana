/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Boom from 'boom';
import { getServerStatus } from '../lib/status_check/server_check';
import { getAgentStatus } from '../lib/status_check/agent_check';
import { setupRequest } from '../lib/helpers/setup_request';

const ROOT = '/api/apm/status';
const defaultErrorHandler = err => {
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initStatusApi(server) {
  server.route({
    method: 'GET',
    path: `${ROOT}/server`,
    config: {
      validate: {
        query: Joi.object().keys({
          _debug: Joi.bool()
        })
      }
    },
    handler: req => {
      const setup = setupRequest(req);
      return getServerStatus({ setup }).catch(defaultErrorHandler);
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/agent`,
    config: {
      validate: {
        query: Joi.object().keys({
          _debug: Joi.bool()
        })
      }
    },
    handler: req => {
      const setup = setupRequest(req);
      return getAgentStatus({ setup }).catch(defaultErrorHandler);
    }
  });
}
