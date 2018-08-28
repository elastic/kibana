/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { getServices } from '../lib/services/get_services';
import { getService } from '../lib/services/get_service';
import { setupRequest } from '../lib/helpers/setup_request';
import { withDefaultValidators } from '../lib/helpers/input_validation';

const ROOT = '/api/apm/services';
const pre = [{ method: setupRequest, assign: 'setup' }];
const defaultErrorHandler = err => {
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initServicesApi(server) {
  server.route({
    method: 'GET',
    path: ROOT,
    config: {
      pre,
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: req => {
      const { setup } = req.pre;
      return getServices({ setup }).catch(defaultErrorHandler);
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/{serviceName}`,
    config: {
      pre,
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: req => {
      const { setup } = req.pre;
      const { serviceName } = req.params;
      return getService({ serviceName, setup }).catch(defaultErrorHandler);
    }
  });
}
