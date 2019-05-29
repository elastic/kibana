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
import { getMetricsChartDataByAgent } from '../lib/metrics/get_metrics_chart_data_by_agent';

const defaultErrorHandler = (err: Error) => {
  // eslint-disable-next-line
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initMetricsApi(core: InternalCoreSetup) {
  const { server } = core.http;

  server.route({
    method: 'GET',
    path: `/api/apm/services/{serviceName}/metrics/charts`,
    options: {
      validate: {
        query: withDefaultValidators({
          agentName: Joi.string().required()
        })
      },
      tags: ['access:apm']
    },
    handler: async req => {
      const setup = setupRequest(req);
      const { serviceName } = req.params;
      // casting approach recommended here: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/25605
      const { agentName } = req.query as { agentName: string };
      return await getMetricsChartDataByAgent({
        setup,
        serviceName,
        agentName
      }).catch(defaultErrorHandler);
    }
  });
}
