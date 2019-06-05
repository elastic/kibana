/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import Joi from 'joi';
import { InternalCoreSetup } from 'src/core/server';
import { withDefaultValidators } from '../lib/helpers/input_validation';
import { setupRequest } from '../lib/helpers/setup_request';
import { getEnvironments } from '../lib/ui_filters/get_environments';

const defaultErrorHandler = (err: Error) => {
  // eslint-disable-next-line
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initUIFiltersApi(core: InternalCoreSetup) {
  const { server } = core.http;
  server.route({
    method: 'GET',
    path: '/api/apm/ui_filters/environments',
    options: {
      validate: {
        query: withDefaultValidators({
          serviceName: Joi.string()
        })
      },
      tags: ['access:apm']
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName } = req.query as {
        serviceName?: string;
      };
      return getEnvironments(setup, serviceName).catch(defaultErrorHandler);
    }
  });
}
