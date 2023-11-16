/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { keyBy, merge, values } from 'lodash';
import { dataStreamTypesRt, sortOrderRt } from '../../types/api_types';
import { DataStreamsStatResponse } from '../../types/data_stream';
import { createDatasetQualityServerRoute } from '../create_datasets_quality_server_route';
import { getDataStreams } from './get_data_streams';
import { getDataStreamsStats } from './get_data_streams_stats';

const statsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/stats',
  params: t.type({
    query: t.intersection([
      dataStreamTypesRt,
      t.partial({
        datasetQuery: t.string,
      }),
      sortOrderRt,
    ]),
  }),
  options: {
    tags: [],
  },
  async handler(resources): Promise<DataStreamsStatResponse> {
    const { context, params } = resources;
    const coreContext = await context.core;

    // Query datastreams as the current user as the Kibana internal user may not have all the required permissions
    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    const [dataStreams, dataStreamsStats] = await Promise.all([
      getDataStreams({
        esClient,
        ...params.query,
        uncategorisedOnly: false,
      }),
      getDataStreamsStats({ esClient, ...params.query }),
    ]);

    return {
      items: values(merge(keyBy(dataStreams.items, 'name'), keyBy(dataStreamsStats.items, 'name'))),
    };
  },
});

export const dataStreamsRouteRepository = {
  ...statsRoute,
};
