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
const pre = [{ method: setupRequest, assign: 'setup' }];
const defaultErrorHandler = reply => err => {
  console.error(err.stack);
  reply(Boom.wrap(err, 400));
};

export function initStatusApi(server) {
  server.route({
    method: 'GET',
    path: `${ROOT}/server`,
    config: {
      pre,
      validate: {
        query: Joi.object().keys({})
      }
    },
    handler: (req, reply) => {
      const { setup } = req.pre;
      return getServerStatus({ setup })
        .then(reply)
        .catch(defaultErrorHandler(reply));
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/agent`,
    config: {
      pre,
      validate: {
        query: Joi.object().keys({})
      }
    },
    handler: (req, reply) => {
      const { setup } = req.pre;
      return getAgentStatus({ setup })
        .then(reply)
        .catch(defaultErrorHandler(reply));
    }
  });
}
