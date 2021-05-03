/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy, keys, merge } from 'lodash';
import type { RequestHandler, SavedObjectsBulkGetObject } from 'src/core/server';

import type { DataStream } from '../../types';
import { KibanaSavedObjectType } from '../../../common';
import type { GetDataStreamsResponse } from '../../../common';
import { getPackageSavedObjects } from '../../services/epm/packages/get';
import { defaultIngestErrorHandler } from '../../errors';

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
  ilm_policy: string;
  hidden: boolean;
}

interface ESDataStreamStats {
  data_stream: string;
  backing_indices: number;
  store_size_bytes: number;
  maximum_timestamp: number;
}

export const getListHandler: RequestHandler = async (context, request, response) => {
  const esClient = context.core.elasticsearch.client.asCurrentUser;

  const body: GetDataStreamsResponse = {
    data_streams: [],
  };

  try {
    // Get matching data streams, their stats, and package SOs
    const [
      {
        body: { data_streams: dataStreamsInfo },
      },
      {
        body: { data_streams: dataStreamStats },
      },
      packageSavedObjects,
    ] = await Promise.all([
      esClient.indices.getDataStream({ name: DATA_STREAM_INDEX_PATTERN }),
      esClient.indices.dataStreamsStats({ name: DATA_STREAM_INDEX_PATTERN }),
      getPackageSavedObjects(context.core.savedObjects.client),
    ]);

    const dataStreamsInfoByName = keyBy<ESDataStreamInfo>(dataStreamsInfo, 'name');
    const dataStreamsStatsByName = keyBy<ESDataStreamStats>(dataStreamStats, 'data_stream');

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
    const allDashboardSavedObjectsResponse = await context.core.savedObjects.client.bulkGet<{
      title?: string;
    }>(
      Object.values(dashboardIdsByPackageName).reduce<SavedObjectsBulkGetObject[]>(
        (allDashboards, dashboardIds) => {
          return allDashboards.concat(
            dashboardIds.map((id) => ({
              id,
              type: KibanaSavedObjectType.dashboard,
              fields: ['title'],
            }))
          );
        },
        []
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
        last_activity_ms: dataStream.maximum_timestamp,
        size_in_bytes: dataStream.store_size_bytes,
        dashboards: [],
      };

      // Query backing indices to extract data stream dataset, namespace, and type values
      const {
        body: {
          // @ts-expect-error @elastic/elasticsearch aggregations are not typed
          aggregations: { dataset, namespace, type },
        },
      } = await esClient.search({
        index: dataStream.indices.map((index) => index.index_name),
        body: {
          size: 0,
          query: {
            bool: {
              must: [
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

      // Set values from backing indices query
      dataStreamResponse.dataset = dataset.buckets[0]?.key || '';
      dataStreamResponse.namespace = namespace.buckets[0]?.key || '';
      dataStreamResponse.type = type.buckets[0]?.key || '';

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

    // Return final data streams objects sorted by last activity, decending
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
