/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { findInventoryFields } from '../../../common/inventory_models';
import { createValidationFunction } from '../../../common/runtime_types';
import { OverviewRequestRT, TopNodesRequestRT } from '../../../common/http_api/overview_api';
import { InfraBackendLibs } from '../../lib/infra_types';
import { createSearchClient } from '../../lib/create_search_client';
import { queryTopNodes } from './lib/get_top_nodes';

interface OverviewESAggResponse {
  memory: { value: number };
  hosts: { value: number };
  cpu: { value: number };
}

export const initOverviewRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/overview/top',
      validate: {
        body: createValidationFunction(TopNodesRequestRT),
      },
    },
    async (requestContext, request, response) => {
      try {
        const options = request.body;
        const client = createSearchClient(requestContext, framework);
        const source = await libs.sources.getSourceConfiguration(
          requestContext.core.savedObjects.client,
          options.sourceId
        );

        const topNResponse = await queryTopNodes(options, client, source);

        return response.ok({
          body: topNResponse,
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
      method: 'post',
      path: '/api/metrics/overview',
      validate: {
        body: createValidationFunction(OverviewRequestRT),
      },
    },
    async (requestContext, request, response) => {
      try {
        const overviewRequest = request.body;

        const client = createSearchClient(requestContext, framework);
        const source = await libs.sources.getSourceConfiguration(
          requestContext.core.savedObjects.client,
          overviewRequest.sourceId
        );

        const inventoryModelFields = findInventoryFields('host', source.configuration.fields);

        const params = {
          index: source.configuration.metricAlias,
          body: {
            query: {
              range: {
                [source.configuration.fields.timestamp]: {
                  gte: overviewRequest.timerange.from,
                  lte: overviewRequest.timerange.to,
                  format: 'epoch_millis',
                },
              },
            },
            aggs: {
              hosts: {
                cardinality: {
                  field: inventoryModelFields.id,
                },
              },
              cpu: {
                avg: {
                  field: 'system.cpu.total.norm.pct',
                },
              },
              memory: {
                avg: {
                  field: 'system.memory.actual.used.pct',
                },
              },
            },
          },
        };

        const esResponse = await client<{}, OverviewESAggResponse>(params);

        return response.ok({
          body: {
            stats: {
              hosts: {
                type: 'number',
                value: esResponse.aggregations?.hosts.value ?? 0,
              },
              cpu: {
                type: 'percent',
                value: esResponse.aggregations?.cpu.value ?? 0,
              },
              memory: {
                type: 'percent',
                value: esResponse.aggregations?.memory.value ?? 0,
              },
            },
          },
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};
