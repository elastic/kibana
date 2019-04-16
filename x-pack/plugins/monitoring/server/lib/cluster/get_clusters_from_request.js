/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { notFound } from 'boom';
import { set, findIndex } from 'lodash';
import { getClustersStats } from './get_clusters_stats';
import { flagSupportedClusters } from './flag_supported_clusters';
import { getMlJobsForCluster } from '../elasticsearch';
import { getKibanasForClusters } from '../kibana';
import { getLogstashForClusters } from '../logstash';
import { getPipelines } from '../logstash/get_pipelines';
import { getBeatsForClusters } from '../beats';
import { alertsClustersAggregation } from '../../cluster_alerts/alerts_clusters_aggregation';
import { alertsClusterSearch } from '../../cluster_alerts/alerts_cluster_search';
import { checkLicense as checkLicenseForAlerts } from '../../cluster_alerts/check_license';
import { getClustersSummary } from './get_clusters_summary';
import { CLUSTER_ALERTS_SEARCH_SIZE, STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../common/constants';
import { getApmsForClusters } from '../apm/get_apms_for_clusters';
import { i18n } from '@kbn/i18n';
import { checkCcrEnabled } from '../elasticsearch/ccr';
import { getStandaloneClusterDefinition, hasStandaloneClusters } from '../standalone_clusters';
import { getLogTypes } from '../logs';

/**
 * Get all clusters or the cluster associated with {@code clusterUuid} when it is defined.
 */
export async function getClustersFromRequest(req, indexPatterns, { clusterUuid, start, end } = {}) {
  const {
    esIndexPattern,
    kbnIndexPattern,
    lsIndexPattern,
    beatsIndexPattern,
    apmIndexPattern,
    alertsIndex,
    filebeatIndexPattern
  } = indexPatterns;

  const isStandaloneCluster = clusterUuid === STANDALONE_CLUSTER_CLUSTER_UUID;

  let clusters = [];

  if (isStandaloneCluster) {
    clusters.push(getStandaloneClusterDefinition());
  }
  else {
    // get clusters with stats and cluster state
    clusters = await getClustersStats(req, esIndexPattern, clusterUuid);
  }

  if (!clusterUuid && !isStandaloneCluster) {
    const indexPatternsToCheckForNonClusters = [
      lsIndexPattern,
      beatsIndexPattern,
      apmIndexPattern
    ];

    if (await hasStandaloneClusters(req, indexPatternsToCheckForNonClusters)) {
      clusters.push(getStandaloneClusterDefinition());
    }
  }

  // TODO: this handling logic should be two different functions
  if (clusterUuid) { // if is defined, get specific cluster (no need for license checking)
    if (!clusters || clusters.length === 0) {
      throw notFound(i18n.translate('xpack.monitoring.requestedClusters.uuidNotFoundErrorMessage', {
        defaultMessage: 'Unable to find the cluster in the selected time range. UUID: {clusterUuid}',
        values: {
          clusterUuid
        }
      }));
    }

    const cluster = clusters[0];

    // add ml jobs and alerts data
    const mlJobs = await getMlJobsForCluster(req, esIndexPattern, cluster);
    if (mlJobs !== null) {
      cluster.ml = { jobs: mlJobs };
    }
    const alerts = await alertsClusterSearch(req, alertsIndex, cluster, checkLicenseForAlerts, {
      start,
      end,
      size: CLUSTER_ALERTS_SEARCH_SIZE
    });
    if (alerts) {
      cluster.alerts = alerts;
    }

    cluster.logs = await getLogTypes(req, filebeatIndexPattern, { clusterUuid: cluster.cluster_uuid, start, end });
  } else if (!isStandaloneCluster) {
    // get all clusters
    if (!clusters || clusters.length === 0) {
      // we do NOT throw 404 here so that the no-data page can use this to check for data
      // we should look at having a standalone function for that lookup
      return [];
    }

    // update clusters with license check results
    const getSupportedClusters = flagSupportedClusters(req, kbnIndexPattern);
    clusters = await getSupportedClusters(clusters);

    // add alerts data
    const clustersAlerts = await alertsClustersAggregation(req, alertsIndex, clusters, checkLicenseForAlerts);
    clusters.forEach((cluster) => {
      cluster.alerts = {
        alertsMeta: {
          enabled: clustersAlerts.alertsMeta.enabled,
          message: clustersAlerts.alertsMeta.message // NOTE: this is only defined when the alert feature is disabled
        },
        ...clustersAlerts[cluster.cluster_uuid]
      };
    });
  }

  // add kibana data

  const kibanas = isStandaloneCluster ? [] : await getKibanasForClusters(req, kbnIndexPattern, clusters);
  // add the kibana data to each cluster
  kibanas.forEach(kibana => {
    const clusterIndex = findIndex(clusters, { cluster_uuid: kibana.clusterUuid });
    set(clusters[clusterIndex], 'kibana', kibana.stats);
  });

  // add logstash data
  const logstashes = await getLogstashForClusters(req, lsIndexPattern, clusters);

  const clusterPipelineNodesCount = await getPipelines(req, lsIndexPattern, ['logstash_cluster_pipeline_nodes_count']);

  // add the logstash data to each cluster
  logstashes.forEach(logstash => {
    const clusterIndex = findIndex(clusters, { cluster_uuid: logstash.clusterUuid });

    // withhold LS overview stats until pipeline metrics have at least one full bucket
    if (logstash.clusterUuid === req.params.clusterUuid && clusterPipelineNodesCount.length === 0) {
      logstash.stats = {};
    }

    set(clusters[clusterIndex], 'logstash', logstash.stats);
  });

  // add beats data
  const beatsByCluster = await getBeatsForClusters(req, beatsIndexPattern, clusters);
  beatsByCluster.forEach(beats => {
    const clusterIndex = findIndex(clusters, { cluster_uuid: beats.clusterUuid });
    set(clusters[clusterIndex], 'beats', beats.stats);
  });

  // add apm data
  const apmsByCluster = await getApmsForClusters(req, apmIndexPattern, clusters);
  apmsByCluster.forEach(apm => {
    const clusterIndex = findIndex(clusters, { cluster_uuid: apm.clusterUuid });
    set(clusters[clusterIndex], 'apm', apm.stats);
  });

  // check ccr configuration
  const isCcrEnabled = await checkCcrEnabled(req, esIndexPattern);

  const config = req.server.config();
  const kibanaUuid = config.get('server.uuid');
  return getClustersSummary(clusters, kibanaUuid, isCcrEnabled);
}
