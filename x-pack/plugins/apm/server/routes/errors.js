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
import { withDefaultValidators } from '../lib/helpers/input_validation';

const ROOT = '/api/apm/services/{serviceName}/errors';
const defaultErrorHandler = err => {
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initErrorsApi(server) {
  server.route({
    method: 'GET',
    path: ROOT,
    config: {
      validate: {
        query: withDefaultValidators({
          sortField: Joi.string(),
          sortDirection: Joi.string()
        })
      }
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName } = req.params;
      const { sortField, sortDirection } = req.query;

      return getErrorGroups({
        serviceName,
        sortField,
        sortDirection,
        setup
      }).catch(defaultErrorHandler);
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/{groupId}`,
    config: {
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName, groupId } = req.params;
      return getErrorGroup({ serviceName, groupId, setup }).catch(
        defaultErrorHandler
      );
    }
  });

  const distributionHandler = req => {
    const setup = setupRequest(req);
    const { serviceName, groupId } = req.params;

    return getDistribution({ serviceName, groupId, setup }).catch(
      defaultErrorHandler
    );
  };

  server.route({
    method: 'GET',
    path: `${ROOT}/{groupId}/distribution`,
    config: {
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: distributionHandler
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/distribution`,
    config: {
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: distributionHandler
  });
}
