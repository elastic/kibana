/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { SourceResponseRuntimeType } from '../../../common/http_api/source_api';
import { InfraBackendLibs } from '../../lib/infra_types';
import { InfraIndexType } from '../../graphql/types';

const typeToInfraIndexType = (value: string | undefined) => {
  switch (value) {
    case 'metrics':
      return InfraIndexType.METRICS;
    case 'logs':
      return InfraIndexType.LOGS;
    default:
      return InfraIndexType.ANY;
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
      try {
        const { type, sourceId } = request.params;

        const source = await libs.sources.getSourceConfiguration(
          requestContext.core.savedObjects.client,
          sourceId
        );
        if (!source) {
          return response.notFound();
        }

        const status = {
          logIndicesExist: await libs.sourceStatus.hasLogIndices(requestContext, sourceId),
          metricIndicesExist: await libs.sourceStatus.hasMetricIndices(requestContext, sourceId),
          indexFields: await libs.fields.getFields(
            requestContext,
            sourceId,
            typeToInfraIndexType(type)
          ),
        };

        return response.ok({
          body: SourceResponseRuntimeType.encode({ source, status }),
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};
