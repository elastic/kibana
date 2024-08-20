/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import Boom from '@hapi/boom';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import { termsQuery } from '@kbn/observability-plugin/server';
import { castArray } from 'lodash';
import { EVENT_MODULE, METRICSET_MODULE } from '../../../common/constants';
import {
  getHasDataQueryParamsRT,
  getHasDataResponseRT,
} from '../../../common/metrics_sources/get_has_data';
import { InfraBackendLibs } from '../../lib/infra_types';
import { hasData } from '../../lib/sources/has_data';
import { createSearchClient } from '../../lib/create_search_client';
import { AnomalyThresholdRangeError, NoSuchRemoteClusterError } from '../../lib/sources/errors';
import {
  metricsSourceConfigurationResponseRT,
  MetricsSourceStatus,
  partialMetricsSourceConfigurationReqPayloadRT,
} from '../../../common/metrics_sources';
import { InfraSource } from '../../lib/sources';
import { InfraPluginRequestHandlerContext } from '../../types';
import { getInfraMetricsClient } from '../../lib/helpers/get_infra_metrics_client';

const defaultStatus = {
  metricIndicesExist: false,
  remoteClustersExist: false,
};

const MAX_MODULES = 5;

export const initMetricsSourceConfigurationRoutes = (libs: InfraBackendLibs) => {
  const { framework, logger } = libs;

  const composeSourceStatus = async (
    requestContext: InfraPluginRequestHandlerContext,
    sourceId: string
  ): Promise<MetricsSourceStatus> => {
    try {
      const hasMetricIndices = await libs.sourceStatus.hasMetricIndices(requestContext, sourceId);
      return {
        metricIndicesExist: hasMetricIndices,
        remoteClustersExist: true,
      };
    } catch (err) {
      logger.error(err);

      if (err instanceof NoSuchRemoteClusterError) {
        return defaultStatus;
      }

      return {
        metricIndicesExist: false,
        remoteClustersExist: true,
      };
    }
  };

  framework.registerRoute(
    {
      method: 'get',
      path: '/api/metrics/source/{sourceId}',
      validate: {
        params: schema.object({
          sourceId: schema.string(),
        }),
      },
    },
    async (requestContext, request, response) => {
      const { sourceId } = request.params;
      const soClient = (await requestContext.core).savedObjects.client;

      try {
        const [sourceSettled, statusSettled] = await Promise.allSettled([
          libs.sources.getSourceConfiguration(soClient, sourceId),
          composeSourceStatus(requestContext, sourceId),
        ]);

        const source = isFulfilled<InfraSource>(sourceSettled) ? sourceSettled.value : null;
        const status = isFulfilled<MetricsSourceStatus>(statusSettled)
          ? statusSettled.value
          : defaultStatus;

        if (!source) {
          return response.notFound();
        }

        const sourceResponse = {
          source: { ...source, status },
        };

        return response.ok({
          body: metricsSourceConfigurationResponseRT.encode(sourceResponse),
        });
      } catch (error) {
        return response.customError({
          statusCode: error.statusCode ?? 500,
          body: {
            message: error.message ?? 'An unexpected error occurred',
          },
        });
      }
    }
  );

  framework.registerRoute(
    {
      method: 'patch',
      path: '/api/metrics/source/{sourceId}',
      validate: {
        params: schema.object({
          sourceId: schema.string(),
        }),
        body: createRouteValidationFunction(partialMetricsSourceConfigurationReqPayloadRT),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      const { sources } = libs;
      const { sourceId } = request.params;
      const sourceConfigurationPayload = request.body;

      try {
        const soClient = (await requestContext.core).savedObjects.client;
        const sourceConfiguration = await sources.getSourceConfiguration(soClient, sourceId);

        if (sourceConfiguration.origin === 'internal') {
          response.conflict({
            body: 'A conflicting read-only source configuration already exists.',
          });
        }

        const sourceConfigurationExists = sourceConfiguration.origin === 'stored';
        const patchedSourceConfiguration = await (sourceConfigurationExists
          ? sources.updateSourceConfiguration(soClient, sourceId, sourceConfigurationPayload)
          : sources.createSourceConfiguration(soClient, sourceId, sourceConfigurationPayload));

        const status = await composeSourceStatus(requestContext, sourceId);

        const sourceResponse = {
          source: { ...patchedSourceConfiguration, status },
        };

        return response.ok({
          body: metricsSourceConfigurationResponseRT.encode(sourceResponse),
        });
      } catch (error) {
        if (Boom.isBoom(error)) {
          throw error;
        }

        if (error instanceof AnomalyThresholdRangeError) {
          return response.customError({
            statusCode: 400,
            body: {
              message: error.message,
            },
          });
        }

        return response.customError({
          statusCode: error.statusCode ?? 500,
          body: {
            message: error.message ?? 'An unexpected error occurred',
          },
        });
      }
    })
  );

  framework.registerRoute(
    {
      method: 'get',
      path: '/api/metrics/source/{sourceId}/hasData',
      validate: {
        params: schema.object({
          sourceId: schema.string(),
        }),
      },
    },
    async (requestContext, request, response) => {
      const { sourceId } = request.params;

      const client = createSearchClient(requestContext, framework);
      const soClient = (await requestContext.core).savedObjects.client;
      const source = await libs.sources.getSourceConfiguration(soClient, sourceId);

      const results = await hasData(source.configuration.metricAlias, client);

      return response.ok({
        body: { hasData: results, configuration: source.configuration },
      });
    }
  );

  framework.registerRoute(
    {
      method: 'get',
      path: '/api/metrics/source/hasData',
      validate: {
        query: createRouteValidationFunction(getHasDataQueryParamsRT),
      },
    },
    async (context, request, response) => {
      try {
        const modules = castArray(request.query.modules);

        if (modules.length > MAX_MODULES) {
          throw Boom.badRequest(
            `'modules' size is greater than maximum of ${MAX_MODULES} allowed.`
          );
        }

        const infraMetricsClient = await getInfraMetricsClient({
          request,
          libs,
          context,
        });

        const results = await infraMetricsClient.search({
          allow_no_indices: true,
          ignore_unavailable: true,
          body: {
            track_total_hits: true,
            terminate_after: 1,
            size: 0,
            ...(modules.length > 0
              ? {
                  query: {
                    bool: {
                      should: [
                        ...termsQuery(EVENT_MODULE, ...modules),
                        ...termsQuery(METRICSET_MODULE, ...modules),
                      ],
                      minimum_should_match: 1,
                    },
                  },
                }
              : {}),
          },
        });

        return response.ok({
          body: getHasDataResponseRT.encode({ hasData: results.hits.total.value !== 0 }),
        });
      } catch (err) {
        if (Boom.isBoom(err)) {
          return response.customError({
            statusCode: err.output.statusCode,
            body: { message: err.output.payload.message },
          });
        }

        return response.customError({
          statusCode: err.statusCode ?? 500,
          body: {
            message: err.message ?? 'An unexpected error occurred',
          },
        });
      }
    }
  );
};

const isFulfilled = <Type>(
  promiseSettlement: PromiseSettledResult<Type>
): promiseSettlement is PromiseFulfilledResult<Type> => promiseSettlement.status === 'fulfilled';
