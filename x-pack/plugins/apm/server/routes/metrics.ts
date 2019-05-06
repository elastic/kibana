/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import Joi from 'joi';
import { CoreSetup } from 'src/core/server';
import { withDefaultValidators } from '../lib/helpers/input_validation';
import { setupRequest } from '../lib/helpers/setup_request';
import { getMetricsChartDataByAgent } from '../lib/metrics/get_metrics_chart_data_by_agent';

const defaultErrorHandler = (err: Error) => {
  // eslint-disable-next-line
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initMetricsApi(core: CoreSetup) {
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
      // ternary type guard required here because req.query can be type: string | RequestQuery
      // and req.query.* can each have a value of type: string | string[]
      const agentName =
        typeof req.query !== 'string' && typeof req.query.agentName === 'string'
          ? req.query.agentName
          : '';
      return await getMetricsChartDataByAgent({
        setup,
        serviceName,
        agentName
      }).catch(defaultErrorHandler);
    }
  });
}
