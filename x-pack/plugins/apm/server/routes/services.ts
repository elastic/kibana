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
const pre = [{ method: setupRequest, assign: 'setup' }];
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
      pre,
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: async req => {
      const { setup } = req.pre;

      let serviceBucketList;
      try {
        serviceBucketList = await getServices(setup);
      } catch (error) {
        return defaultErrorHandler(error);
      }

      // Store telemetry data derived from serviceBucketList
      const apmTelemetry = createApmTelementry(
        serviceBucketList.map(({ agentName }) => agentName as AgentName)
      );
      storeApmTelemetry(server, apmTelemetry);

      return serviceBucketList;
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/{serviceName}`,
    options: {
      pre,
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: req => {
      const { setup } = req.pre;
      const { serviceName } = req.params;
      return getService(serviceName, setup).catch(defaultErrorHandler);
    }
  });
}
