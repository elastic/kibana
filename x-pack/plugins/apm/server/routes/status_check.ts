/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Server } from 'hapi';
import Joi from 'joi';
import { setupRequest } from '../lib/helpers/setup_request';
import { getAgentStatus } from '../lib/status_check/agent_check';
import { getServerStatus } from '../lib/status_check/server_check';

const ROOT = '/api/apm/status';
const defaultErrorHandler = (err: Error) => {
  // tslint:disable-next-line
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initStatusApi(server: Server) {
  server.route({
    method: 'GET',
    path: `${ROOT}/server`,
    options: {
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
    options: {
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
