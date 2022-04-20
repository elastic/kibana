/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
import { checkParam } from '../error_missing_required';
import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../common/constants';
import { ElasticsearchResponse } from '../../../common/types/es';
import { LegacyRequest, Cluster } from '../../types';
import { getNewIndexPatterns } from './get_index_patterns';
import { Globals } from '../../static_globals';

async function findSupportedBasicLicenseCluster(
  req: LegacyRequest,
  clusters: Cluster[],
  ccs: string,
  kibanaUuid: string,
  serverLog: (message: string) => void
) {
  const dataset = 'stats';
  const moduleType = 'kibana';
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    moduleType,
    dataset,
    ccs,
  });

  serverLog(
    `Detected all clusters in monitoring data have basic license. Checking for supported admin cluster UUID for Kibana ${kibanaUuid}.`
  );

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const gte = req.payload.timeRange.min;
  const lte = req.payload.timeRange.max;
  const kibanaDataResult: ElasticsearchResponse = (await callWithRequest(req, 'search', {
    index: indexPatterns,
    size: 1,
    ignore_unavailable: true,
    filter_path: ['hits.hits._source.cluster_uuid', 'hits.hits._source.cluster.id'],
    body: {
      sort: { timestamp: { order: 'desc', unmapped_type: 'long' } },
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  { term: { type: 'kibana_stats' } },
                  { term: { 'data_stream.dataset': 'kibana.stats' } },
                ],
              },
            },
            { term: { 'kibana_stats.kibana.uuid': kibanaUuid } },
            { range: { timestamp: { gte, lte, format: 'strict_date_optional_time' } } },
          ],
        },
      },
    },
  })) as ElasticsearchResponse;
  const supportedClusterUuid = kibanaDataResult.hits?.hits[0]?._source.cluster_uuid ?? undefined;
  for (const cluster of clusters) {
    if (cluster.cluster_uuid === supportedClusterUuid) {
      cluster.isSupported = true;
    }
  }
  serverLog(
    `Found basic license admin cluster UUID for Monitoring UI support: ${supportedClusterUuid}.`
  );

  return clusters;
}

/*
 * Flag clusters as supported, which means their monitoring data can be seen in the UI.
 *
 * Flagging a Basic licensed cluster as supported when it is part of a multi-cluster environment:
 * 1. Detect if there any standalone clusters and ignore those for these calculations as they are auto supported
 * 2. Detect if there are multiple linked clusters
 * 3. Detect if all of the different linked cluster licenses are basic
 * 4. Make a query to the monitored kibana data to find the "supported" linked cluster
 *    UUID, which is the linked cluster associated with *this* Kibana instance.
 * 5. Flag the linked cluster object with an `isSupported` boolean
 *
 * Non-Basic license clusters and any cluster in a single-cluster environment
 * are also flagged as supported in this method.
 */
export function flagSupportedClusters(req: LegacyRequest, ccs: string) {
  const serverLog = (message: string) => req.getLogger('supported-clusters').debug(message);
  const flagAllSupported = (clusters: Cluster[]) => {
    clusters.forEach((cluster) => {
      if (cluster.license || cluster.elasticsearch?.cluster?.stats?.license) {
        cluster.isSupported = true;
      }
    });
    return clusters;
  };

  return async function (clusters: Cluster[]) {
    // Standalone clusters are automatically supported in the UI so ignore those for
    // our calculations here
    let linkedClusterCount = 0;
    for (const cluster of clusters) {
      if (cluster.cluster_uuid === STANDALONE_CLUSTER_CLUSTER_UUID) {
        cluster.isSupported = true;
      } else {
        linkedClusterCount++;
      }
    }
    if (linkedClusterCount > 1) {
      const basicLicenseCount = clusters.reduce((accumCount, cluster) => {
        const licenseType =
          cluster.license?.type ?? cluster.elasticsearch?.cluster?.stats?.license?.type;
        if (licenseType === 'basic') {
          accumCount++;
        }
        return accumCount;
      }, 0);

      // if all non-basic licenses
      if (basicLicenseCount === 0) {
        serverLog('Found all non-basic cluster licenses. All clusters will be supported.');
        return flagAllSupported(clusters);
      }

      // if all linked are basic licenses
      if (linkedClusterCount === basicLicenseCount) {
        const kibanaUuid = req.server.instanceUuid;
        return await findSupportedBasicLicenseCluster(req, clusters, ccs, kibanaUuid, serverLog);
      }

      // if some non-basic licenses
      serverLog(
        'Found some basic license clusters in monitoring data. Only non-basic will be supported.'
      );
      clusters.forEach((cluster) => {
        if (
          cluster.license?.type !== 'basic' &&
          cluster.elasticsearch?.cluster?.stats?.license?.type !== 'basic'
        ) {
          cluster.isSupported = true;
        }
      });
      return clusters;
    }

    // not multi-cluster
    serverLog('Found single cluster in monitoring data.');
    return flagAllSupported(clusters);
  };
}
