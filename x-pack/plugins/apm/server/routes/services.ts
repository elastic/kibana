/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Server } from 'hapi';
import {
  AgentName,
  createApmTelementry,
  storeApmTelemetry
} from '../lib/apm_telemetry';
import { withDefaultValidators } from '../lib/helpers/input_validation';
import { setupRequest } from '../lib/helpers/setup_request';
import { getService } from '../lib/services/get_service';
import { getServices } from '../lib/services/get_services';

const ROOT = '/api/apm/services';
const defaultErrorHandler = (err: Error) => {
  // tslint:disable-next-line
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initServicesApi(server: Server) {
  server.route({
    method: 'GET',
    path: ROOT,
    options: {
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: async req => {
      const setup = setupRequest(req);
      const services = await getServices(setup).catch(defaultErrorHandler);

      // Store telemetry data derived from services
      const agentNames = services.map(
        ({ agentName }) => agentName as AgentName
      );
      const apmTelemetry = createApmTelementry(agentNames);
      storeApmTelemetry(server, apmTelemetry);

      return services;
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/{serviceName}`,
    options: {
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName } = req.params;
      return getService(serviceName, setup).catch(defaultErrorHandler);
    }
  });
}
