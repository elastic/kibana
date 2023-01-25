/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { keyBy, keys, merge } from 'lodash';
import type { RequestHandler } from '@kbn/core/server';

import type { DataStream } from '../../types';
import { KibanaSavedObjectType } from '../../../common/types';
import type { GetDataStreamsResponse } from '../../../common/types';
import { getPackageSavedObjects } from '../../services/epm/packages/get';
import { defaultFleetErrorHandler } from '../../errors';
import { dataStreamService } from '../../services/data_streams';

import { getDataStreamsQueryMetadata } from './get_data_streams_query_metadata';

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

export const getListHandler: RequestHandler = async (context, request, response) => {
  // Query datastreams as the current user as the Kibana internal user may not have all the required permission
  const { savedObjects, elasticsearch } = await context.core;
  const esClient = elasticsearch.client.asCurrentUser;

  const body: GetDataStreamsResponse = {
    data_streams: [],
  };

  try {
    // Get matching data streams, their stats, and package SOs
    const [dataStreamsInfo, dataStreamStats, packageSavedObjects] = await Promise.all([
      dataStreamService.getAllFleetDataStreams(esClient),
      dataStreamService.getAllFleetDataStreamsStats(esClient),
      getPackageSavedObjects(savedObjects.client),
    ]);

    // managed_by property 'ingest-manager' added to allow for legacy data streams to be displayed
    // See https://github.com/elastic/elastic-agent/issues/654

    const filteredDataStreamsInfo = dataStreamsInfo.filter(
      (ds) => ds?._meta?.managed_by === 'fleet' || ds?._meta?.managed_by === 'ingest-manager'
    );

    const dataStreamsInfoByName = keyBy<ESDataStreamInfo>(filteredDataStreamsInfo, 'name');

    const filteredDataStreamsStats = dataStreamStats.filter(
      (dss) => !!dataStreamsInfoByName[dss.data_stream]
    );
    const dataStreamsStatsByName = keyBy(filteredDataStreamsStats, 'data_stream');

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
        serviceDetails: null,
      };

      const { maxIngested, namespace, dataset, type, serviceNames, environments } =
        await getDataStreamsQueryMetadata({ dataStreamName: dataStream.name, esClient });

      // some integrations e.g custom logs don't have event.ingested
      if (maxIngested) {
        dataStreamResponse.last_activity_ms = maxIngested;
      }

      if (serviceNames?.length === 1) {
        const serviceDetails = {
          serviceName: serviceNames[0],
          environment: environments?.length === 1 ? environments[0] : 'ENVIRONMENT_ALL',
        };
        dataStreamResponse.serviceDetails = serviceDetails;
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
    // After filtering out data streams that are missing dataset/namespace/type/package fields
    body.data_streams = (await Promise.all(dataStreamPromises))
      .filter(({ dataset, namespace, type }) => dataset && namespace && type)
      .sort((a, b) => b.last_activity_ms - a.last_activity_ms);
    return response.ok({
      body,
    });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};
