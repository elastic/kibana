/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import Boom from '@hapi/boom';
import { createValidationFunction } from '../../../common/runtime_types';
import {
  InfraSourceStatus,
  SavedSourceConfigurationRuntimeType,
  SourceResponseRuntimeType,
} from '../../../common/http_api/source_api';
import { InfraBackendLibs } from '../../lib/infra_types';
import { hasData } from '../../lib/sources/has_data';
import { createSearchClient } from '../../lib/create_search_client';
import { AnomalyThresholdRangeError } from '../../lib/sources/errors';

const typeToInfraIndexType = (value: string | undefined) => {
  switch (value) {
    case 'metrics':
      return 'METRICS';
    case 'logs':
      return 'LOGS';
    default:
      return 'ANY';
  }
};

export const initSourceRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'get',
      path: '/api/metrics/source/{sourceId}/{type?}',
      validate: {
        params: schema.object({
          sourceId: schema.string(),
          type: schema.string(),
        }),
      },
    },
    async (requestContext, request, response) => {
      const { type, sourceId } = request.params;

      const [source, logIndexStatus, metricIndicesExist, indexFields] = await Promise.all([
        libs.sources.getSourceConfiguration(requestContext.core.savedObjects.client, sourceId),
        libs.sourceStatus.getLogIndexStatus(requestContext, sourceId),
        libs.sourceStatus.hasMetricIndices(requestContext, sourceId),
        libs.fields.getFields(requestContext, sourceId, typeToInfraIndexType(type)),
      ]);

      if (!source) {
        return response.notFound();
      }

      const status: InfraSourceStatus = {
        logIndicesExist: logIndexStatus !== 'missing',
        metricIndicesExist,
        indexFields,
      };

      return response.ok({
        body: SourceResponseRuntimeType.encode({ source: { ...source, status } }),
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
        body: createValidationFunction(SavedSourceConfigurationRuntimeType),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      const { sources } = libs;
      const { sourceId } = request.params;
      const patchedSourceConfigurationProperties = request.body;

      try {
        const sourceConfiguration = await sources.getSourceConfiguration(
          requestContext.core.savedObjects.client,
          sourceId
        );

        if (sourceConfiguration.origin === 'internal') {
          response.conflict({
            body: 'A conflicting read-only source configuration already exists.',
          });
        }

        const sourceConfigurationExists = sourceConfiguration.origin === 'stored';
        const patchedSourceConfiguration = await (sourceConfigurationExists
          ? sources.updateSourceConfiguration(
              requestContext.core.savedObjects.client,
              sourceId,
              patchedSourceConfigurationProperties
            )
          : sources.createSourceConfiguration(
              requestContext.core.savedObjects.client,
              sourceId,
              patchedSourceConfigurationProperties
            ));

        const [logIndexStatus, metricIndicesExist, indexFields] = await Promise.all([
          libs.sourceStatus.getLogIndexStatus(requestContext, sourceId),
          libs.sourceStatus.hasMetricIndices(requestContext, sourceId),
          libs.fields.getFields(requestContext, sourceId, typeToInfraIndexType('metrics')),
        ]);

        const status: InfraSourceStatus = {
          logIndicesExist: logIndexStatus !== 'missing',
          metricIndicesExist,
          indexFields,
        };

        return response.ok({
          body: SourceResponseRuntimeType.encode({
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
      path: '/api/metrics/source/{sourceId}/{type}/hasData',
      validate: {
        params: schema.object({
          sourceId: schema.string(),
          type: schema.string(),
        }),
      },
    },
    async (requestContext, request, response) => {
      const { type, sourceId } = request.params;

      const client = createSearchClient(requestContext, framework);
      const source = await libs.sources.getSourceConfiguration(
        requestContext.core.savedObjects.client,
        sourceId
      );
      const indexPattern =
        type === 'metrics' ? source.configuration.metricAlias : source.configuration.logAlias;
      const results = await hasData(indexPattern, client);

      return response.ok({
        body: { hasData: results },
      });
    }
  );
};
