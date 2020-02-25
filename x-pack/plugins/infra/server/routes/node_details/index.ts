/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { schema } from '@kbn/config-schema';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { InfraBackendLibs } from '../../lib/infra_types';
import { UsageCollector } from '../../usage/usage_collector';
import { InfraMetricsRequestOptions } from '../../lib/adapters/metrics';

import {
  NodeDetailsRequestRT,
  NodeDetailsMetricDataResponseRT,
} from '../../../common/http_api/node_details_api';
import { throwErrors } from '../../../common/runtime_types';

const escapeHatch = schema.object({}, { allowUnknowns: true });

export const initNodeDetailsRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/node_details',
      validate: {
        body: escapeHatch,
      },
    },
    async (requestContext, request, response) => {
      try {
        const { nodeId, cloudId, nodeType, metrics, timerange, sourceId } = pipe(
          NodeDetailsRequestRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );
        const source = await libs.sources.getSourceConfiguration(requestContext, sourceId);

        UsageCollector.countNode(nodeType);

        const options: InfraMetricsRequestOptions = {
          nodeIds: {
            nodeId,
            cloudId,
          },
          nodeType,
          sourceConfiguration: source.configuration,
          metrics,
          timerange,
        };
        return response.ok({
          body: NodeDetailsMetricDataResponseRT.encode({
            metrics: await libs.metrics.getMetrics(requestContext, options, request),
          }),
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};
