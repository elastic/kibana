/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { keyBy, merge, values } from 'lodash';
import { DataStreamStat } from '../../types/data_stream';
import { dataStreamTypesRt, rangeRt } from '../../types/default_api_types';
import { Integration } from '../../types/integration';
import { createDatasetQualityServerRoute } from '../create_datasets_quality_server_route';
import { getDataStreams } from './get_data_streams';
import { getDataStreamsStats } from './get_data_streams_stats';
import { getMalformedDocsPaginated } from './get_malformed_docs';
import { MalformedDocs } from '../../../common/api_types';

const statsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/stats',
  params: t.type({
    query: t.intersection([
      dataStreamTypesRt,
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
    integrations: Integration[];
  }> {
    const { context, params, plugins } = resources;
    const coreContext = await context.core;

    // Query datastreams as the current user as the Kibana internal user may not have all the required permissions
    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    const fleetPluginStart = await plugins.fleet.start();
    const packageClient = fleetPluginStart.packageService.asInternalUser;
    const packages = await packageClient.getPackages();

    const [dataStreams, dataStreamsStats] = await Promise.all([
      getDataStreams({
        esClient,
        ...params.query,
        uncategorisedOnly: false,
      }),
      getDataStreamsStats({ esClient, ...params.query }),
    ]);

    const installedPackages = dataStreams.items.map((item) => item.integration);

    const integrations = packages
      .filter((pkg) => installedPackages.includes(pkg.name))
      .map((p) => ({
        name: p.name,
        title: p.title,
        version: p.version,
        icons: p.icons,
      }));

    return {
      dataStreamsStats: values(
        merge(keyBy(dataStreams.items, 'name'), keyBy(dataStreamsStats.items, 'name'))
      ),
      integrations,
    };
  },
});

const malformedDocsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/malformed_docs',
  params: t.type({
    query: t.intersection([
      rangeRt,
      dataStreamTypesRt,
      t.partial({
        datasetQuery: t.string,
      }),
    ]),
  }),
  options: {
    tags: [],
  },
  async handler(resources): Promise<{
    malformedDocs: MalformedDocs[];
  }> {
    const { context, params } = resources;
    const coreContext = await context.core;

    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    const malformedDocs = await getMalformedDocsPaginated({
      esClient,
      ...params.query,
    });

    return {
      malformedDocs,
    };
  },
});

export const dataStreamsRouteRepository = {
  ...statsRoute,
  ...malformedDocsRoute,
};
