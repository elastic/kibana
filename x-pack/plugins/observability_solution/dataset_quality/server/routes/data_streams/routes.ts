/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { keyBy, merge, values } from 'lodash';
import {
  DataStreamDetails,
  DataStreamsEstimatedDataInBytes,
  DataStreamSettings,
  DataStreamStat,
  DegradedDocs,
} from '../../../common/api_types';
import { indexNameToDataStreamParts } from '../../../common/utils';
import { rangeRt, typeRt } from '../../types/default_api_types';
import { createDatasetQualityServerRoute } from '../create_datasets_quality_server_route';
import { getDataStreamDetails, getDataStreamSettings } from './get_data_stream_details';
import { getDataStreams } from './get_data_streams';
import { getDataStreamsStats } from './get_data_streams_stats';
import { getDegradedDocsPaginated } from './get_degraded_docs';
import { getEstimatedDataInBytes } from './get_estimated_data_in_bytes';

const statsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/stats',
  params: t.type({
    query: t.intersection([
      typeRt,
      t.partial({
        datasetQuery: t.string,
      }),
    ]),
  }),
  options: {
    tags: [],
  },
  async handler(resources): Promise<{
    dataStreamsStats: DataStreamStat[];
  }> {
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
      dataStreamsStats: values(
        merge(keyBy(dataStreams.items, 'name'), keyBy(dataStreamsStats.items, 'name'))
      ),
    };
  },
});

const degradedDocsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/degraded_docs',
  params: t.type({
    query: t.intersection([
      rangeRt,
      typeRt,
      t.partial({
        datasetQuery: t.string,
      }),
    ]),
  }),
  options: {
    tags: [],
  },
  async handler(resources): Promise<{
    degradedDocs: DegradedDocs[];
  }> {
    const { context, params } = resources;
    const coreContext = await context.core;

    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    const degradedDocs = await getDegradedDocsPaginated({
      esClient,
      ...params.query,
    });

    return {
      degradedDocs,
    };
  },
});

const dataStreamSettingsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/{dataStream}/settings',
  params: t.type({
    path: t.type({
      dataStream: t.string,
    }),
  }),
  options: {
    tags: [],
  },
  async handler(resources): Promise<DataStreamSettings> {
    const { context, params } = resources;
    const { dataStream } = params.path;
    const coreContext = await context.core;

    // Query datastreams as the current user as the Kibana internal user may not have all the required permissions
    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    const dataStreamSettings = await getDataStreamSettings({
      esClient,
      dataStream,
    });

    return dataStreamSettings;
  },
});

const dataStreamDetailsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/{dataStream}/details',
  params: t.type({
    path: t.type({
      dataStream: t.string,
    }),
    query: rangeRt,
  }),
  options: {
    tags: [],
  },
  async handler(resources): Promise<DataStreamDetails> {
    const { context, params, getEsCapabilities } = resources;
    const { dataStream } = params.path;
    const { start, end } = params.query;
    const coreContext = await context.core;

    // Query datastreams as the current user as the Kibana internal user may not have all the required permissions
    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    const { type, dataset, namespace } = indexNameToDataStreamParts(dataStream);
    const sizeStatsAvailable = !(await getEsCapabilities()).serverless;

    const [dataStreamsStats, dataStreamDetails] = await Promise.all([
      getDataStreamsStats({
        esClient,
        type,
        datasetQuery: `${dataset}-${namespace}`,
      }),
      getDataStreamDetails({ esClient, dataStream, start, end, sizeStatsAvailable }),
    ]);

    return {
      docsCount: dataStreamDetails?.docsCount,
      degradedDocsCount: dataStreamDetails?.degradedDocsCount,
      services: dataStreamDetails?.services,
      hosts: dataStreamDetails?.hosts,
      sizeBytes: dataStreamDetails?.sizeBytes,
      lastActivity: dataStreamsStats.items?.[0]?.lastActivity,
    };
  },
});

const estimatedDataInBytesRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/estimated_data',
  params: t.type({
    query: t.intersection([typeRt, rangeRt]),
  }),
  options: {
    tags: [],
  },
  async handler(resources): Promise<DataStreamsEstimatedDataInBytes> {
    const { context, params, getEsCapabilities } = resources;
    const coreContext = await context.core;

    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const isServerless = (await getEsCapabilities()).serverless;

    if (isServerless) {
      return {
        estimatedDataInBytes: null,
      };
    }

    const estimatedDataInBytes = await getEstimatedDataInBytes({
      esClient,
      ...params.query,
    });

    return {
      estimatedDataInBytes,
    };
  },
});

export const dataStreamsRouteRepository = {
  ...statsRoute,
  ...degradedDocsRoute,
  ...dataStreamDetailsRoute,
  ...dataStreamSettingsRoute,
  ...estimatedDataInBytesRoute,
};
