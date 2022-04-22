/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import Boom from '@hapi/boom';
import { createValidationFunction } from '../../../common/runtime_types';
import { InfraBackendLibs } from '../../lib/infra_types';
import { hasData } from '../../lib/sources/has_data';
import { createSearchClient } from '../../lib/create_search_client';
import { AnomalyThresholdRangeError } from '../../lib/sources/errors';
import {
  partialMetricsSourceConfigurationPropertiesRT,
  metricsSourceConfigurationResponseRT,
  MetricsSourceStatus,
} from '../../../common/metrics_sources';

export const initMetricsSourceConfigurationRoutes = (libs: InfraBackendLibs) => {
  const { framework } = libs;

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

      const [source, metricIndicesExist, indexFields] = await Promise.all([
        libs.sources.getSourceConfiguration(soClient, sourceId),
        libs.sourceStatus.hasMetricIndices(requestContext, sourceId),
        libs.fields.getFields(requestContext, sourceId, 'METRICS'),
      ]);

      if (!source) {
        return response.notFound();
      }

      const status: MetricsSourceStatus = {
        metricIndicesExist,
        indexFields,
      };

      return response.ok({
        body: metricsSourceConfigurationResponseRT.encode({ source: { ...source, status } }),
      });
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
        body: createValidationFunction(partialMetricsSourceConfigurationPropertiesRT),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      const { sources } = libs;
      const { sourceId } = request.params;
      const patchedSourceConfigurationProperties = request.body;

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
          ? sources.updateSourceConfiguration(
              soClient,
              sourceId,
              // @ts-ignore
              patchedSourceConfigurationProperties
            )
          : sources.createSourceConfiguration(
              soClient,
              sourceId,
              // @ts-ignore
              patchedSourceConfigurationProperties
            ));

        const [metricIndicesExist, indexFields] = await Promise.all([
          libs.sourceStatus.hasMetricIndices(requestContext, sourceId),
          libs.fields.getFields(requestContext, sourceId, 'METRICS'),
        ]);

        const status: MetricsSourceStatus = {
          metricIndicesExist,
          indexFields,
        };

        return response.ok({
          body: metricsSourceConfigurationResponseRT.encode({
            source: { ...patchedSourceConfiguration, status },
          }),
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
