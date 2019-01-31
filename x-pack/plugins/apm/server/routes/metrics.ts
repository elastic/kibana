/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Server } from 'hapi';
import { withDefaultValidators } from '../lib/helpers/input_validation';
import { setupRequest } from '../lib/helpers/setup_request';
import { getAllMetricsChartData } from '../lib/metrics/get_all_metrics_chart_data';

const defaultErrorHandler = (err: Error) => {
  // tslint:disable-next-line
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initMetricsApi(server: Server) {
  server.route({
    method: 'GET',
    path: `/api/apm/services/{serviceName}/metrics/charts`,
    options: {
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: async req => {
      const setup = setupRequest(req);
      const { serviceName } = req.params;
      return await getAllMetricsChartData({
        setup,
        serviceName
      }).catch(defaultErrorHandler);
    }
  });
}
