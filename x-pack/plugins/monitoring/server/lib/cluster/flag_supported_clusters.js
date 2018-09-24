/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set, find } from 'lodash';
import { checkParam } from '../error_missing_required';
import { createTypeFilter } from '../create_query';
import { LOGGING_TAG } from '../../../common/constants';

async function findSupportedBasicLicenseCluster(req, clusters, kbnIndexPattern, kibanaUuid, serverLog) {
  checkParam(kbnIndexPattern, 'kbnIndexPattern in cluster/findSupportedBasicLicenseCluster');

  serverLog(
    `Detected all clusters in monitoring data have basic license. Checking for supported admin cluster UUID for Kibana ${kibanaUuid}.`
  );

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const gte = req.payload.timeRange.min;
  const lte = req.payload.timeRange.max;
  const kibanaDataResult = await callWithRequest(req, 'search', {
    index: kbnIndexPattern,
    size: 1,
    ignoreUnavailable: true,
    filterPath: 'hits.hits._source.cluster_uuid',
    body: {
      sort: { 'timestamp': { order: 'desc' } },
      query: {
        bool: {
          filter: [
            { ...createTypeFilter('kibana_stats') },
            { term: { 'kibana_stats.kibana.uuid': kibanaUuid } },
            { range: { timestamp: { gte, lte, format: 'strict_date_optional_time' } } }
          ]
        }
      }
    }
  });
  const supportedClusterUuid = get(kibanaDataResult, 'hits.hits[0]._source.cluster_uuid');
  const supportedCluster = find(clusters, { cluster_uuid: supportedClusterUuid });
  // only this basic cluster is supported
  set(supportedCluster, 'isSupported', true);

  serverLog(`Found basic license admin cluster UUID for Monitoring UI support: ${supportedClusterUuid}.`);

  return clusters;
}

/*
 * Flag clusters as supported, which means their monitoring data can be seen in the UI.
 *
 * Flagging a Basic licensed cluster as supported when it is part of a multi-cluster environment:
 * 1. Detect if there are multiple clusters
 * 2. Detect if all of the different cluster licenses are basic
 * 3. Make a query to the monitored kibana data to find the "supported" cluster
 *    UUID, which is the cluster associated with *this* Kibana instance.
 * 4. Flag the cluster object with an `isSupported` boolean
 *
 * Non-Basic license clusters and any cluster in a single-cluster environment
 * are also flagged as supported in this method.
 */
export function flagSupportedClusters(req, kbnIndexPattern) {
  checkParam(kbnIndexPattern, 'kbnIndexPattern in cluster/flagSupportedClusters');

  const config = req.server.config();
  const serverLog = (msg) => req.server.log(['debug', LOGGING_TAG, 'supported-clusters'], msg);
  const flagAllSupported = (clusters) => {
    clusters.forEach(cluster => {
      if (cluster.license) {
        cluster.isSupported = true;
      }
    });
    return clusters;
  };

  return async function (clusters) {
    // if multi cluster
    if (clusters.length > 1) {
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

      // if all basic licenses
      if (clusters.length === basicLicenseCount) {
        const kibanaUuid = config.get('server.uuid');
        return await findSupportedBasicLicenseCluster(req, clusters, kbnIndexPattern, kibanaUuid, serverLog);
      }

      // if some non-basic licenses
      serverLog('Found some basic license clusters in monitoring data. Only non-basic will be supported.');
      clusters.forEach(cluster => {
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
