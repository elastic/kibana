/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import Boom from '@hapi/boom';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import { InfraBackendLibs } from '../../lib/infra_types';
import { hasData } from '../../lib/sources/has_data';
import { createSearchClient } from '../../lib/create_search_client';
import { AnomalyThresholdRangeError, NoSuchRemoteClusterError } from '../../lib/sources/errors';
import {
  metricsSourceConfigurationResponseRT,
  MetricsSourceStatus,
  partialMetricsSourceConfigurationReqPayloadRT,
} from '../../../common/metrics_sources';
import { InfraSource, InfraSourceIndexField } from '../../lib/sources';
import { InfraPluginRequestHandlerContext } from '../../types';

const defaultStatus = {
  indexFields: [],
  metricIndicesExist: false,
  remoteClustersExist: false,
};

export const initMetricsSourceConfigurationRoutes = (libs: InfraBackendLibs) => {
  const { framework, logger } = libs;

  const composeSourceStatus = async (
    requestContext: InfraPluginRequestHandlerContext,
    sourceId: string
  ): Promise<MetricsSourceStatus> => {
    const [metricIndicesExistSettled, indexFieldsSettled] = await Promise.allSettled([
      libs.sourceStatus.hasMetricIndices(requestContext, sourceId),
      libs.fields.getFields(requestContext, sourceId, 'METRICS'),
    ]);

    /**
     * Extract values from promises settlements
     */
    const indexFields = isFulfilled<InfraSourceIndexField[]>(indexFieldsSettled)
      ? indexFieldsSettled.value
      : defaultStatus.indexFields;
    const metricIndicesExist = isFulfilled<boolean>(metricIndicesExistSettled)
      ? metricIndicesExistSettled.value
      : defaultStatus.metricIndicesExist;
    const remoteClustersExist = hasRemoteCluster<boolean | InfraSourceIndexField[]>(
      indexFieldsSettled,
      metricIndicesExistSettled
    );

    /**
     * Report gracefully handled rejections
     */
    if (!isFulfilled<InfraSourceIndexField[]>(indexFieldsSettled)) {
      logger.error(indexFieldsSettled.reason);
    }
    if (!isFulfilled<boolean>(metricIndicesExistSettled)) {
      logger.error(metricIndicesExistSettled.reason);
    }

    return {
      indexFields,
      metricIndicesExist,
      remoteClustersExist,
    };
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
};

const isFulfilled = <Type>(
  promiseSettlement: PromiseSettledResult<Type>
): promiseSettlement is PromiseFulfilledResult<Type> => promiseSettlement.status === 'fulfilled';

const hasRemoteCluster = <Type>(...promiseSettlements: Array<PromiseSettledResult<Type>>) => {
  const isRemoteMissing = promiseSettlements.some(
    (settlement) =>
      !isFulfilled<Type>(settlement) && settlement.reason instanceof NoSuchRemoteClusterError
  );

  return !isRemoteMissing;
};
