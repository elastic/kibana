/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { schema } from '@kbn/config-schema';
import { throwErrors } from '@kbn/io-ts-utils';
import { InfraBackendLibs } from '../../lib/infra_types';
import { createSearchClient } from '../../lib/create_search_client';
import { query } from '../../lib/metrics';
import { MetricsAPIRequestRT, MetricsAPIResponseRT } from '../../../common/http_api';

const escapeHatch = schema.object({}, { unknowns: 'allow' });

export const initMetricsAPIRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;
  framework.registerRoute(
    {
      method: 'post',
      path: '/api/infra/metrics_api',
      validate: {
        body: escapeHatch,
      },
    },
    async (requestContext, request, response) => {
      const options = pipe(
        MetricsAPIRequestRT.decode(request.body),
        fold(throwErrors(Boom.badRequest), identity)
      );

      const client = createSearchClient(requestContext, framework);
      const metricsApiResponse = await query(client, options);

      return response.ok({
        body: MetricsAPIResponseRT.encode(metricsApiResponse),
      });
    }
  );
};
