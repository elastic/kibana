/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createValidationFunction } from '../../../common/runtime_types';
import { TopNodesRequestRT } from '../../../common/http_api/overview_api';
import { InfraBackendLibs } from '../../lib/infra_types';
import { createSearchClient } from '../../lib/create_search_client';
import { queryTopNodes } from './lib/get_top_nodes';

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
      const options = request.body;
      const client = createSearchClient(requestContext, framework);
      const soClient = (await requestContext.core).savedObjects.client;
      const source = await libs.sources.getSourceConfiguration(soClient, options.sourceId);

      const topNResponse = await queryTopNodes(options, client, source);

      return response.ok({
        body: topNResponse,
      });
    }
  );
};
