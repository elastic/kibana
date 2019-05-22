/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import Joi from 'joi';
import { Legacy } from 'kibana';
import { CoreSetup } from 'src/core/server';
import { getDistribution } from '../lib/errors/distribution/get_distribution';
import { getErrorGroup } from '../lib/errors/get_error_group';
import { getErrorGroups } from '../lib/errors/get_error_groups';
import { withDefaultValidators } from '../lib/helpers/input_validation';
import { setupRequest } from '../lib/helpers/setup_request';

const ROOT = '/api/apm/services/{serviceName}/errors';
const defaultErrorHandler = (err: Error) => {
  // eslint-disable-next-line
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initErrorsApi(core: CoreSetup) {
  const { server } = core.http;
  server.route({
    method: 'GET',
    path: ROOT,
    options: {
      validate: {
        query: withDefaultValidators({
          sortField: Joi.string(),
          sortDirection: Joi.string()
        })
      },
      tags: ['access:apm']
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName } = req.params;
      const { sortField, sortDirection } = req.query as {
        sortField: string;
        sortDirection: string;
      };

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
    options: {
      validate: {
        query: withDefaultValidators()
      },
      tags: ['access:apm']
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName, groupId } = req.params;
      return getErrorGroup({ serviceName, groupId, setup }).catch(
        defaultErrorHandler
      );
    }
  });

  function distributionHandler(req: Legacy.Request) {
    const setup = setupRequest(req);
    const { serviceName, groupId } = req.params;

    return getDistribution({ serviceName, groupId, setup }).catch(
      defaultErrorHandler
    );
  }

  server.route({
    method: 'GET',
    path: `${ROOT}/{groupId}/distribution`,
    options: {
      validate: {
        query: withDefaultValidators()
      },
      tags: ['access:apm']
    },
    handler: distributionHandler
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/distribution`,
    options: {
      validate: {
        query: withDefaultValidators()
      },
      tags: ['access:apm']
    },
    handler: distributionHandler
  });
}
