/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { memoize } from 'lodash';
import pLimit from 'p-limit';
import {
  Dashboard,
  DataStreamDetails,
  DataStreamSettings,
  DataStreamStat,
  DatasetUserPrivileges,
  DegradedDocs,
  DegradedFieldResponse,
  DegradedFieldValues,
  NonAggregatableDatasets,
} from '../../../common/api_types';
import { datasetQualityPrivileges } from '../../services';
import { rangeRt, typeRt, typesRt } from '../../types/default_api_types';
import { createDatasetQualityServerRoute } from '../create_datasets_quality_server_route';
import { getIntegrationDashboards } from '../integrations/get_integration_dashboards';
import { getDataStreamDetails, getDataStreamSettings } from './get_data_stream_details';
import { getDataStreams } from './get_data_streams';
import { getDataStreamsStats } from './get_data_streams_stats';
import { getDegradedDocsPaginated } from './get_degraded_docs';
import { getDegradedFieldValues } from './get_degraded_field_values';
import { getDegradedFields } from './get_degraded_fields';
import { getNonAggregatableDataStreams } from './get_non_aggregatable_data_streams';

const statsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/stats',
  params: t.type({
    query: t.intersection([
      t.type({ types: typesRt }),
      t.partial({
        datasetQuery: t.string,
      }),
    ]),
  }),
  options: {
    tags: [],
  },
  async handler(resources): Promise<{
    datasetUserPrivileges: DatasetUserPrivileges;
    dataStreamsStats: DataStreamStat[];
  }> {
    const { context, params, getEsCapabilities } = resources;
    const coreContext = await context.core;
    const isServerless = (await getEsCapabilities()).serverless;

    // Query datastreams as the current user as the Kibana internal user may not have all the required permissions
    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    const { dataStreams, datasetUserPrivileges } = await getDataStreams({
      esClient,
      ...params.query,
      uncategorisedOnly: false,
    });

    const privilegedDataStreams = dataStreams.filter((dataStream) => {
      return dataStream.userPrivileges.canMonitor;
    });

    const dataStreamsStats = isServerless
      ? {}
      : await getDataStreamsStats({
          esClient,
          dataStreams: privilegedDataStreams.map((stream) => stream.name),
        });

    return {
      datasetUserPrivileges,
      dataStreamsStats: dataStreams.map((dataStream: DataStreamStat) => {
        dataStream.size = dataStreamsStats[dataStream.name]?.size;
        dataStream.sizeBytes = dataStreamsStats[dataStream.name]?.sizeBytes;
        dataStream.totalDocs = dataStreamsStats[dataStream.name]?.totalDocs;

        return dataStream;
      }),
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

    await datasetQualityPrivileges.throwIfCannotReadDataset(
      esClient,
      params.query.type,
      params.query.datasetQuery
    );

    const degradedDocs = await getDegradedDocsPaginated({
      esClient,
      ...params.query,
    });

    return {
      degradedDocs,
    };
  },
});

const nonAggregatableDatasetsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/non_aggregatable',
  params: t.type({
    query: t.intersection([
      rangeRt,
      t.type({ types: typesRt }),
      t.partial({
        dataStream: t.string,
      }),
    ]),
  }),
  options: {
    tags: [],
  },
  async handler(resources): Promise<NonAggregatableDatasets> {
    const { context, params } = resources;
    const coreContext = await context.core;

    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    return await getNonAggregatableDataStreams({
      esClient,
      ...params.query,
    });
  },
});

const nonAggregatableDatasetRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/{dataStream}/non_aggregatable',
  params: t.type({
    path: t.type({
      dataStream: t.string,
    }),
    query: t.intersection([rangeRt, typeRt]),
  }),
  options: {
    tags: [],
  },
  async handler(resources): Promise<NonAggregatableDatasets> {
    const { context, params } = resources;
    const coreContext = await context.core;

    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    await datasetQualityPrivileges.throwIfCannotReadDataset(esClient, params.query.type);

    return await getNonAggregatableDataStreams({
      esClient,
      ...params.query,
      types: [params.query.type],
    });
  },
});

const degradedFieldsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/data_streams/{dataStream}/degraded_fields',
  params: t.type({
    path: t.type({
      dataStream: t.string,
    }),
    query: rangeRt,
  }),
  options: {
    tags: [],
  },
  async handler(resources): Promise<DegradedFieldResponse> {
    const { context, params } = resources;
    const { dataStream } = params.path;
    const coreContext = await context.core;

    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    return await getDegradedFields({
      esClient,
      dataStream,
      ...params.query,
    });
  },
});

const degradedFieldValuesRoute = createDatasetQualityServerRoute({
  endpoint:
    'GET /internal/dataset_quality/data_streams/{dataStream}/degraded_field/{degradedField}/values',
  params: t.type({
    path: t.type({
      dataStream: t.string,
      degradedField: t.string,
    }),
  }),
  options: {
    tags: [],
  },
  async handler(resources): Promise<DegradedFieldValues> {
    const { context, params } = resources;
    const { dataStream, degradedField } = params.path;
    const coreContext = await context.core;

    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    return await getDegradedFieldValues({
      esClient,
      dataStream,
      degradedField,
    });
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

    const isServerless = (await getEsCapabilities()).serverless;
    const dataStreamDetails = await getDataStreamDetails({
      esClient,
      dataStream,
      start,
      end,
      isServerless,
    });

    return dataStreamDetails;
  },
});

const dataStreamsIntegrationsRoute = createDatasetQualityServerRoute({
  endpoint: 'POST /internal/dataset_quality/data_streams/integrations',
  params: t.type({
    body: t.type({
      dataStreams: t.array(t.string),
    }),
  }),
  options: {
    tags: [],
  },
  async handler(resources): Promise<{
    dataStreams: Array<{
      name: string;
      integration?: string;
      dashboards?: Dashboard[];
    }>;
  }> {
    const { context, params, plugins, logger } = resources;
    const { dataStreams } = params.body;
    const coreContext = await context.core;

    // Query datastreams as the current user as the Kibana internal user may not have all the required permissions
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const soClient = coreContext.savedObjects.client;

    const [dataStreamsWithPackageNames, packageClient] = await Promise.all([
      esClient.indices
        .getDataStream({
          name: dataStreams,
        })
        .then((response) => {
          return new Map(
            response.data_streams.map((dataStreamInfo) => {
              const dataStreamMeta = dataStreamInfo._meta as
                | undefined
                | {
                    package?: {
                      name?: string;
                    };
                  };

              const packageName = dataStreamMeta?.package?.name;

              const name = dataStreamInfo.name;

              return [
                name,
                {
                  name,
                  packageName,
                },
              ];
            })
          );
        }),
      plugins.fleet.start().then((fleetStart) => fleetStart.packageService.asInternalUser),
    ]);

    const limiter = pLimit(5);

    const getDashboardsMemoized = memoize(async (name: string) => {
      return await getIntegrationDashboards(packageClient, soClient, name);
    });

    const dataStreamsWithIntegrations = await Promise.all(
      dataStreams.map(async (name) => {
        return limiter(async () => {
          const dataStreamMeta = dataStreamsWithPackageNames.get(name);
          const packageName = dataStreamMeta?.packageName;

          return packageName
            ? {
                name,
                integration: packageName,
                dashboards: await getDashboardsMemoized(packageName),
              }
            : { name };
        });
      })
    );

    return {
      dataStreams: dataStreamsWithIntegrations,
    };
  },
});

export const dataStreamsRouteRepository = {
  ...statsRoute,
  ...degradedDocsRoute,
  ...nonAggregatableDatasetsRoute,
  ...nonAggregatableDatasetRoute,
  ...degradedFieldsRoute,
  ...degradedFieldValuesRoute,
  ...dataStreamDetailsRoute,
  ...dataStreamSettingsRoute,
  ...dataStreamsIntegrationsRoute,
};
