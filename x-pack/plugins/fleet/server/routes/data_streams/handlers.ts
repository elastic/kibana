/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { keyBy, keys, merge } from 'lodash';
import type { RequestHandler, ElasticsearchClient } from '@kbn/core/server';

import type { TypeOf } from '@kbn/config-schema';

import type { DataStream } from '../../types';
import { KibanaSavedObjectType } from '../../../common';
import type { GetDataStreamsResponse } from '../../../common';
import { getPackageSavedObjects } from '../../services/epm/packages/get';
import { defaultIngestErrorHandler } from '../../errors';
import type { GetDataStreamsListRequestSchema } from '../../../common/constants/data_streams';

const DATA_STREAM_INDEX_PATTERN = 'logs-*-*,metrics-*-*,traces-*-*,synthetics-*-*';

interface ESDataStreamInfo {
  name: string;
  timestamp_field: {
    name: string;
  };
  indices: Array<{ index_name: string; index_uuid: string }>;
  generation: number;
  _meta?: {
    package?: {
      name: string;
    };
    managed_by?: string;
    managed?: boolean;
    [key: string]: any;
  };
  status: string;
  template: string;
  ilm_policy?: string;
  hidden: boolean;
}

async function getMetadataFromTermsEnum({
  dataStreamName,
  esClient,
}: {
  dataStreamName: string;
  esClient: ElasticsearchClient;
}) {
  const [maxEventIngestedResponse, namespaceResponse, datasetResponse, typeResponse] =
    await Promise.all([
      esClient.search({
        size: 1,
        index: dataStreamName,
        sort: {
          // @ts-expect-error Type '{ 'event.ingested': string; }' is not assignable to type 'string | string[] | undefined'.
          'event.ingested': 'desc',
        },
        _source: false,
        fields: ['event.ingested'],
      }),
      esClient.termsEnum({
        index: dataStreamName,
        field: 'data_stream.namespace',
      }),
      esClient.termsEnum({
        index: dataStreamName,
        field: 'data_stream.dataset',
      }),
      esClient.termsEnum({
        index: dataStreamName,
        field: 'data_stream.type',
      }),
    ]);

  const maxIngested = new Date(
    maxEventIngestedResponse.hits.hits[0]?.fields!['event.ingested']
  ).getTime();

  const namespace = namespaceResponse.terms[0] ?? '';
  const dataset = datasetResponse.terms[0] ?? '';
  const type = typeResponse.terms[0] ?? '';

  return {
    maxIngested,
    namespace,
    dataset,
    type,
  };
}

async function getMetadataFromAggregations({
  dataStreamName,
  esClient,
}: {
  dataStreamName: string;
  esClient: ElasticsearchClient;
}) {
  // Query backing indices to extract data stream dataset, namespace, and type values
  const { aggregations: dataStreamAggs } = await esClient.search({
    index: dataStreamName,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              exists: {
                field: 'data_stream.namespace',
              },
            },
            {
              exists: {
                field: 'data_stream.dataset',
              },
            },
          ],
        },
      },
      aggs: {
        maxIngestedTimestamp: {
          max: {
            field: 'event.ingested',
          },
        },
        dataset: {
          terms: {
            field: 'data_stream.dataset',
            size: 1,
          },
        },
        namespace: {
          terms: {
            field: 'data_stream.namespace',
            size: 1,
          },
        },
        type: {
          terms: {
            field: 'data_stream.type',
            size: 1,
          },
        },
      },
    },
  });

  const { maxIngestedTimestamp } = dataStreamAggs as Record<
    string,
    estypes.AggregationsRateAggregate
  >;
  const { dataset, namespace, type } = dataStreamAggs as Record<
    string,
    estypes.AggregationsMultiBucketAggregateBase<{ key?: string; value?: number }>
  >;

  const maxIngested = maxIngestedTimestamp?.value;

  return {
    maxIngested,
    dataset: (dataset.buckets as Array<{ key?: string; value?: number }>)[0]?.key || '',
    namespace: (namespace.buckets as Array<{ key?: string; value?: number }>)[0]?.key || '',
    type: (type.buckets as Array<{ key?: string; value?: number }>)[0]?.key || '',
  };
}

export const getListHandler: RequestHandler = async (context, request, response) => {
  // Query datastreams as the current user as the Kibana internal user may not have all the required permission
  const { savedObjects, elasticsearch } = await context.core;
  const esClient = elasticsearch.client.asCurrentUser;

  const { use_terms_enum: useTermsEnum } = request.params as TypeOf<
    typeof GetDataStreamsListRequestSchema['params']
  >;

  const body: GetDataStreamsResponse = {
    data_streams: [],
  };

  try {
    // Get matching data streams, their stats, and package SOs
    const [
      { data_streams: dataStreamsInfo },
      { data_streams: dataStreamStats },
      packageSavedObjects,
    ] = await Promise.all([
      esClient.indices.getDataStream({ name: DATA_STREAM_INDEX_PATTERN }),
      esClient.indices.dataStreamsStats({ name: DATA_STREAM_INDEX_PATTERN, human: true }),
      getPackageSavedObjects(savedObjects.client),
    ]);

    const dataStreamsInfoByName = keyBy<ESDataStreamInfo>(dataStreamsInfo, 'name');
    const dataStreamsStatsByName = keyBy(dataStreamStats, 'data_stream');

    // Combine data stream info
    const dataStreams = merge(dataStreamsInfoByName, dataStreamsStatsByName);
    const dataStreamNames = keys(dataStreams);

    // Map package SOs
    const packageSavedObjectsByName = keyBy(packageSavedObjects.saved_objects, 'id');
    const packageMetadata: any = {};

    // Get dashboard information for all packages
    const dashboardIdsByPackageName = packageSavedObjects.saved_objects.reduce<
      Record<string, string[]>
    >((allDashboards, pkgSavedObject) => {
      const dashboards: string[] = [];
      (pkgSavedObject.attributes?.installed_kibana || []).forEach((o) => {
        if (o.type === KibanaSavedObjectType.dashboard) {
          dashboards.push(o.id);
        }
      });
      allDashboards[pkgSavedObject.id] = dashboards;
      return allDashboards;
    }, {});
    const allDashboardSavedObjectsResponse = await savedObjects.client.bulkGet<{
      title?: string;
    }>(
      Object.values(dashboardIdsByPackageName).flatMap((dashboardIds) =>
        dashboardIds.map((id) => ({
          id,
          type: KibanaSavedObjectType.dashboard,
          fields: ['title'],
        }))
      )
    );
    // Ignore dashboards not found
    const allDashboardSavedObjects = allDashboardSavedObjectsResponse.saved_objects.filter((so) => {
      if (so.error) {
        if (so.error.statusCode === 404) {
          return false;
        }
        throw so.error;
      }
      return true;
    });

    const allDashboardSavedObjectsById = keyBy(
      allDashboardSavedObjects,
      (dashboardSavedObject) => dashboardSavedObject.id
    );

    // Query additional information for each data stream
    const dataStreamPromises = dataStreamNames.map(async (dataStreamName) => {
      const dataStream = dataStreams[dataStreamName];
      const dataStreamResponse: DataStream = {
        index: dataStreamName,
        dataset: '',
        namespace: '',
        type: '',
        package: dataStream._meta?.package?.name || '',
        package_version: '',
        last_activity_ms: dataStream.maximum_timestamp, // overridden below if maxIngestedTimestamp agg returns a result
        size_in_bytes: dataStream.store_size_bytes,
        // `store_size` should be available from ES due to ?human=true flag
        // but fallback to bytes just in case
        size_in_bytes_formatted: dataStream.store_size || `${dataStream.store_size_bytes}b`,
        dashboards: [],
      };

      const { maxIngested, namespace, dataset, type } = useTermsEnum
        ? await getMetadataFromTermsEnum({ dataStreamName: dataStream.name, esClient })
        : await getMetadataFromAggregations({ dataStreamName: dataStream.name, esClient });

      // some integrations e.g custom logs don't have event.ingested
      if (maxIngested) {
        dataStreamResponse.last_activity_ms = maxIngested;
      }

      dataStreamResponse.dataset = dataset;
      dataStreamResponse.namespace = namespace;
      dataStreamResponse.type = type;

      // Find package saved object
      const pkgName = dataStreamResponse.package;
      const pkgSavedObject = pkgName ? packageSavedObjectsByName[pkgName] : null;

      if (pkgSavedObject) {
        // if
        // - the data stream is associated with a package
        // - and the package has been installed through EPM
        // - and we didn't pick the metadata in an earlier iteration of this map()
        if (!packageMetadata[pkgName]) {
          // then pick the dashboards from the package saved object
          const packageDashboardIds = dashboardIdsByPackageName[pkgName] || [];
          const packageDashboards = packageDashboardIds.reduce<
            Array<{ id: string; title: string }>
          >((dashboards, dashboardId) => {
            const dashboard = allDashboardSavedObjectsById[dashboardId];
            if (dashboard) {
              dashboards.push({
                id: dashboard.id,
                title: dashboard.attributes.title || dashboard.id,
              });
            }
            return dashboards;
          }, []);

          packageMetadata[pkgName] = {
            version: pkgSavedObject.attributes?.version || '',
            dashboards: packageDashboards,
          };
        }

        // Set values from package information
        dataStreamResponse.package = pkgName;
        dataStreamResponse.package_version = packageMetadata[pkgName].version;
        dataStreamResponse.dashboards = packageMetadata[pkgName].dashboards;
      }

      return dataStreamResponse;
    });

    // Return final data streams objects sorted by last activity, descending
    // After filtering out data streams that are missing dataset/namespace/type fields
    body.data_streams = (await Promise.all(dataStreamPromises))
      .filter(({ dataset, namespace, type }) => dataset && namespace && type)
      .sort((a, b) => b.last_activity_ms - a.last_activity_ms);
    return response.ok({
      body,
    });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};
