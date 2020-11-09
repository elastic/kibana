/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { SourceResponseRuntimeType } from '../../../common/http_api/source_api';
import { InfraBackendLibs } from '../../lib/infra_types';
import { InfraIndexType } from '../../graphql/types';
import { hasData } from '../../lib/sources/has_data';
import { createSearchClient } from '../../lib/create_search_client';

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

        const [source, logIndexStatus, metricIndicesExist, indexFields] = await Promise.all([
          libs.sources.getSourceConfiguration(requestContext.core.savedObjects.client, sourceId),
          libs.sourceStatus.getLogIndexStatus(requestContext, sourceId),
          libs.sourceStatus.hasMetricIndices(requestContext, sourceId),
          libs.fields.getFields(requestContext, sourceId, typeToInfraIndexType(type)),
        ]);

        if (!source) {
          return response.notFound();
        }

        const status = {
          logIndicesExist: logIndexStatus !== 'missing',
          metricIndicesExist,
          indexFields,
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
      try {
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
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};
