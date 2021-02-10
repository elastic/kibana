/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
import { checkParam } from '../error_missing_required';
import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../common/constants';
import { ElasticsearchResponse, ElasticsearchModifiedSource } from '../../../common/types/es';
import { LegacyRequest } from '../../types';

async function findSupportedBasicLicenseCluster(
  req: LegacyRequest,
  clusters: ElasticsearchModifiedSource[],
  kbnIndexPattern: string,
  kibanaUuid: string,
  serverLog: (message: string) => void
) {
  checkParam(kbnIndexPattern, 'kbnIndexPattern in cluster/findSupportedBasicLicenseCluster');

  serverLog(
    `Detected all clusters in monitoring data have basic license. Checking for supported admin cluster UUID for Kibana ${kibanaUuid}.`
  );

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const gte = req.payload.timeRange.min;
  const lte = req.payload.timeRange.max;
  const kibanaDataResult: ElasticsearchResponse = (await callWithRequest(req, 'search', {
    index: kbnIndexPattern,
    size: 1,
    ignoreUnavailable: true,
    filterPath: 'hits.hits._source.cluster_uuid',
    body: {
      sort: { timestamp: { order: 'desc', unmapped_type: 'long' } },
      query: {
        bool: {
          filter: [
            { term: { type: 'kibana_stats' } },
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
export function flagSupportedClusters(req: LegacyRequest, kbnIndexPattern: string) {
  checkParam(kbnIndexPattern, 'kbnIndexPattern in cluster/flagSupportedClusters');

  const config = req.server.config();
  const serverLog = (message: string) => req.getLogger('supported-clusters').debug(message);
  const flagAllSupported = (clusters: ElasticsearchModifiedSource[]) => {
    clusters.forEach((cluster) => {
      if (cluster.license) {
        cluster.isSupported = true;
      }
    });
    return clusters;
  };

  return async function (clusters: ElasticsearchModifiedSource[]) {
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
        if (cluster.license && cluster.license.type === 'basic') {
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
        const kibanaUuid = config.get('server.uuid') as string;
        return await findSupportedBasicLicenseCluster(
          req,
          clusters,
          kbnIndexPattern,
          kibanaUuid,
          serverLog
        );
      }

      // if some non-basic licenses
      serverLog(
        'Found some basic license clusters in monitoring data. Only non-basic will be supported.'
      );
      clusters.forEach((cluster) => {
        if (cluster.license && cluster.license.type !== 'basic') {
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
