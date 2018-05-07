/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Boom from 'boom';

import { getDistribution } from '../lib/errors/distribution/get_distribution';
import { getErrorGroups } from '../lib/errors/get_error_groups';
import { getErrorGroup } from '../lib/errors/get_error_group';
import { setupRequest } from '../lib/helpers/setup_request';
import { dateValidation } from '../lib/helpers/date_validation';

const pre = [{ method: setupRequest, assign: 'setup' }];
const ROOT = '/api/apm/services/{serviceName}/errors';
const defaultErrorHandler = reply => err => {
  console.error(err.stack);
  reply(Boom.wrap(err, 400));
};

export function initErrorsApi(server) {
  server.route({
    method: 'GET',
    path: ROOT,
    config: {
      pre,
      validate: {
        query: Joi.object().keys({
          start: dateValidation,
          end: dateValidation,
          q: Joi.string().allow(''),
          sortBy: Joi.string(),
          sortOrder: Joi.string()
        })
      }
    },
    handler: (req, reply) => {
      const { setup } = req.pre;
      const { serviceName } = req.params;
      const { q, sortBy, sortOrder } = req.query;

      return getErrorGroups({
        serviceName,
        q,
        sortBy,
        sortOrder,
        setup
      })
        .then(reply)
        .catch(defaultErrorHandler(reply));
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/{groupId}`,
    config: {
      pre,
      validate: {
        query: Joi.object().keys({
          start: dateValidation,
          end: dateValidation
        })
      }
    },
    handler: (req, reply) => {
      const { setup } = req.pre;
      const { serviceName, groupId } = req.params;
      return getErrorGroup({ serviceName, groupId, setup })
        .then(reply)
        .catch(defaultErrorHandler(reply));
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/{groupId}/distribution`,
    config: {
      pre,
      validate: {
        query: Joi.object().keys({
          start: dateValidation,
          end: dateValidation
        })
      }
    },
    handler: (req, reply) => {
      const { setup } = req.pre;
      const { serviceName, groupId } = req.params;

      return getDistribution({ serviceName, groupId, setup })
        .then(reply)
        .catch(defaultErrorHandler(reply));
    }
  });
}
