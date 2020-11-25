/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RequestHandler, SavedObjectsClientContract } from 'src/core/server';
import { DataStream } from '../../types';
import { GetDataStreamsResponse, KibanaAssetType, KibanaSavedObjectType } from '../../../common';
import { getPackageSavedObjects, getKibanaSavedObject } from '../../services/epm/packages/get';
import { defaultIngestErrorHandler } from '../../errors';

const DATA_STREAM_INDEX_PATTERN = 'logs-*-*,metrics-*-*';

export const getListHandler: RequestHandler = async (context, request, response) => {
  const callCluster = context.core.elasticsearch.legacy.client.callAsCurrentUser;

  try {
    // Get stats (size on disk) of all potentially matching indices
    const { indices: indexStats } = await callCluster('indices.stats', {
      index: DATA_STREAM_INDEX_PATTERN,
      metric: ['store'],
    });

    // Get all matching indices and info about each
    // This returns the top 100,000 indices (as buckets) by last activity
    const { aggregations } = await callCluster('search', {
      index: DATA_STREAM_INDEX_PATTERN,
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
          index: {
            terms: {
              field: '_index',
              size: 100000,
              order: {
                last_activity: 'desc',
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
              last_activity: {
                max: {
                  field: '@timestamp',
                },
              },
            },
          },
        },
      },
    });

    const body: GetDataStreamsResponse = {
      data_streams: [],
    };

    if (!(aggregations && aggregations.index && aggregations.index.buckets)) {
      return response.ok({
        body,
      });
    }

    const {
      index: { buckets: indexResults },
    } = aggregations;

    const packageSavedObjects = await getPackageSavedObjects(context.core.savedObjects.client);
    const packageMetadata: any = {};

    const dataStreamsPromises = (indexResults as any[]).map(async (result) => {
      const {
        key: indexName,
        dataset: { buckets: datasetBuckets },
        namespace: { buckets: namespaceBuckets },
        type: { buckets: typeBuckets },
        last_activity: { value_as_string: lastActivity },
      } = result;

      // We don't have a reliable way to associate index with package ID, so
      // this is a hack to extract the package ID from the first part of the dataset name
      // with fallback to extraction from index name
      const pkg = datasetBuckets.length
        ? datasetBuckets[0].key.split('.')[0]
        : indexName.split('-')[1].split('.')[0];
      const pkgSavedObject = packageSavedObjects.saved_objects.filter((p) => p.id === pkg);

      // if
      // - the datastream is associated with a package
      // - and the package has been installed through EPM
      // - and we didn't pick the metadata in an earlier iteration of this map()
      if (pkg !== '' && pkgSavedObject.length > 0 && !packageMetadata[pkg]) {
        // then pick the dashboards from the package saved object
        const dashboards =
          pkgSavedObject[0].attributes?.installed_kibana?.filter(
            (o) => o.type === KibanaSavedObjectType.dashboard
          ) || [];
        // and then pick the human-readable titles from the dashboard saved objects
        const enhancedDashboards = await getEnhancedDashboards(
          context.core.savedObjects.client,
          dashboards
        );

        packageMetadata[pkg] = {
          version: pkgSavedObject[0].attributes?.version || '',
          dashboards: enhancedDashboards,
        };
      }

      return {
        index: indexName,
        dataset: datasetBuckets.length ? datasetBuckets[0].key : '',
        namespace: namespaceBuckets.length ? namespaceBuckets[0].key : '',
        type: typeBuckets.length ? typeBuckets[0].key : '',
        package: pkgSavedObject.length ? pkg : '',
        package_version: packageMetadata[pkg] ? packageMetadata[pkg].version : '',
        last_activity: lastActivity,
        size_in_bytes: indexStats[indexName] ? indexStats[indexName].total.store.size_in_bytes : 0,
        dashboards: packageMetadata[pkg] ? packageMetadata[pkg].dashboards : [],
      };
    });

    const dataStreams: DataStream[] = await Promise.all(dataStreamsPromises);

    body.data_streams = dataStreams;

    return response.ok({
      body,
    });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

const getEnhancedDashboards = async (
  savedObjectsClient: SavedObjectsClientContract,
  dashboards: any[]
) => {
  const dashboardsPromises = dashboards.map(async (db) => {
    const dbSavedObject: any = await getKibanaSavedObject(
      savedObjectsClient,
      KibanaAssetType.dashboard,
      db.id
    );
    return {
      id: db.id,
      title: dbSavedObject.attributes?.title || db.id,
    };
  });
  return await Promise.all(dashboardsPromises);
};
