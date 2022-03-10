/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { get } from 'lodash';
import { set } from '@elastic/safer-lodash-set';
import { i18n } from '@kbn/i18n';
import { getClustersStats } from './get_clusters_stats';
import { flagSupportedClusters } from './flag_supported_clusters';
import { getMlJobsForCluster } from '../elasticsearch';
import { getKibanasForClusters } from '../kibana';
import { getEnterpriseSearchForClusters } from '../enterprise_search';
import { getLogstashForClusters } from '../logstash';
import { getLogstashPipelineIds } from '../logstash/get_pipeline_ids';
import { getBeatsForClusters } from '../beats';
import { getClustersSummary, EnhancedClusters } from './get_clusters_summary';
import {
  STANDALONE_CLUSTER_CLUSTER_UUID,
  CODE_PATH_ML,
  CODE_PATH_ALERTS,
  CODE_PATH_LOGS,
  CODE_PATH_KIBANA,
  CODE_PATH_LOGSTASH,
  CODE_PATH_BEATS,
  CODE_PATH_APM,
  CODE_PATH_ENTERPRISE_SEARCH,
} from '../../../common/constants';

import { getApmsForClusters } from '../apm/get_apms_for_clusters';
import { checkCcrEnabled } from '../elasticsearch/ccr';
import { fetchStatus } from '../alerts/fetch_status';
import { getStandaloneClusterDefinition, hasStandaloneClusters } from '../standalone_clusters';
import { getLogTypes } from '../logs';
import { isInCodePath } from './is_in_code_path';
import { LegacyRequest, Cluster } from '../../types';
import { RulesByType } from '../../../common/types/alerts';

/**
 * Get all clusters or the cluster associated with {@code clusterUuid} when it is defined.
 */
export async function getClustersFromRequest(
  req: LegacyRequest,
  indexPatterns: { [x: string]: string },
  {
    clusterUuid,
    start,
    end,
    codePaths,
  }: { clusterUuid?: string; start?: number; end?: number; codePaths: string[] }
) {
  const { filebeatIndexPattern } = indexPatterns;

  const isStandaloneCluster = clusterUuid === STANDALONE_CLUSTER_CLUSTER_UUID;

  let clusters: Cluster[] = [];

  if (isStandaloneCluster) {
    clusters.push(getStandaloneClusterDefinition());
  } else {
    // get clusters with stats and cluster state
    clusters = await getClustersStats(req, clusterUuid, '*');
  }

  if (!clusterUuid && !isStandaloneCluster) {
    if (await hasStandaloneClusters(req, '*')) {
      clusters.push(getStandaloneClusterDefinition());
    }
  }

  // TODO: this handling logic should be two different functions
  if (clusterUuid) {
    // if is defined, get specific cluster (no need for license checking)
    if (!clusters || clusters.length === 0) {
      throw notFound(
        i18n.translate('xpack.monitoring.requestedClusters.uuidNotFoundErrorMessage', {
          defaultMessage:
            'Unable to find the cluster in the selected time range. UUID: {clusterUuid}',
          values: {
            clusterUuid,
          },
        })
      );
    }

    const cluster = clusters[0];

    // add ml jobs and alerts data
    const mlJobs = isInCodePath(codePaths, [CODE_PATH_ML])
      ? await getMlJobsForCluster(req, cluster, '*')
      : null;
    if (mlJobs !== null) {
      cluster.ml = { jobs: mlJobs };
    }

    cluster.logs =
      start && end && isInCodePath(codePaths, [CODE_PATH_LOGS])
        ? await getLogTypes(req, filebeatIndexPattern, {
            clusterUuid: get(cluster, 'elasticsearch.cluster.id', cluster.cluster_uuid),
            start,
            end,
          })
        : [];
  } else if (!isStandaloneCluster) {
    // get all clusters
    if (!clusters || clusters.length === 0) {
      // we do NOT throw 404 here so that the no-data page can use this to check for data
      // we should look at having a standalone function for that lookup
      return [];
    }

    // update clusters with license check results
    const getSupportedClusters = flagSupportedClusters(req, '*');
    clusters = await getSupportedClusters(clusters);

    // add alerts data
    if (isInCodePath(codePaths, [CODE_PATH_ALERTS])) {
      const rulesClient = req.getRulesClient();
      const alertStatus = await fetchStatus(
        rulesClient,
        undefined,
        clusters.map((cluster) => get(cluster, 'elasticsearch.cluster.id', cluster.cluster_uuid))
      );

      for (const cluster of clusters) {
        if (!rulesClient) {
          cluster.alerts = {
            list: {},
            alertsMeta: {
              enabled: false,
            },
          };
        } else {
          try {
            cluster.alerts = {
              list: Object.keys(alertStatus).reduce<RulesByType>((acc, ruleTypeName) => {
                acc[ruleTypeName] = alertStatus[ruleTypeName].map((rule) => ({
                  ...rule,
                  states: rule.states.filter(
                    (state) =>
                      state.state.cluster.clusterUuid ===
                      get(cluster, 'elasticsearch.cluster.id', cluster.cluster_uuid)
                  ),
                }));
                return acc;
              }, {}),
              alertsMeta: {
                enabled: true,
              },
            };
          } catch (err) {
            req.logger.warn(
              `Unable to fetch alert status because '${err.message}'. Alerts may not properly show up in the UI.`
            );
            cluster.alerts = {
              list: {},
              alertsMeta: {
                enabled: true,
              },
            };
          }
        }
      }
    }
  }
  // add kibana data
  const kibanas =
    isInCodePath(codePaths, [CODE_PATH_KIBANA]) && !isStandaloneCluster
      ? await getKibanasForClusters(req, clusters, '*')
      : [];
  // add the kibana data to each cluster
  kibanas.forEach((kibana) => {
    const clusterIndex = clusters.findIndex(
      (cluster) =>
        get(cluster, 'elasticsearch.cluster.id', cluster.cluster_uuid) === kibana.clusterUuid
    );
    set(clusters[clusterIndex], 'kibana', kibana.stats);
  });

  // add logstash data
  if (isInCodePath(codePaths, [CODE_PATH_LOGSTASH])) {
    const logstashes = await getLogstashForClusters(req, clusters, '*');
    const pipelines = await getLogstashPipelineIds({ req, clusterUuid, size: 1, ccs: '*' });
    logstashes.forEach((logstash) => {
      const clusterIndex = clusters.findIndex(
        (cluster) =>
          get(cluster, 'elasticsearch.cluster.id', cluster.cluster_uuid) === logstash.clusterUuid
      );
      // withhold LS overview stats until there is at least 1 pipeline
      if (logstash.clusterUuid === clusterUuid && !pipelines.length) {
        Reflect.set(logstash, 'stats', {});
      }
      set(clusters[clusterIndex], 'logstash', logstash.stats);
    });
  }

  // add beats data
  const beatsByCluster = isInCodePath(codePaths, [CODE_PATH_BEATS])
    ? await getBeatsForClusters(req, clusters, '*')
    : [];
  beatsByCluster.forEach((beats) => {
    const clusterIndex = clusters.findIndex(
      (cluster) =>
        get(cluster, 'elasticsearch.cluster.id', cluster.cluster_uuid) === beats.clusterUuid
    );
    set(clusters[clusterIndex], 'beats', beats.stats);
  });

  // add apm data
  const apmsByCluster = isInCodePath(codePaths, [CODE_PATH_APM])
    ? await getApmsForClusters(req, clusters, '*')
    : [];
  apmsByCluster.forEach((apm) => {
    const clusterIndex = clusters.findIndex(
      (cluster) =>
        get(cluster, 'elasticsearch.cluster.id', cluster.cluster_uuid) === apm.clusterUuid
    );
    if (clusterIndex >= 0) {
      const { stats, config: apmConfig } = apm;
      Reflect.set(clusters[clusterIndex], 'apm', {
        ...stats,
        config: apmConfig,
      });
    }
  });

  // add Enterprise Search data
  const enterpriseSearchByCluster = isInCodePath(codePaths, [CODE_PATH_ENTERPRISE_SEARCH])
    ? await getEnterpriseSearchForClusters(req, clusters, '*')
    : [];
  enterpriseSearchByCluster.forEach((entSearch) => {
    const clusterIndex = clusters.findIndex(
      (cluster) =>
        get(cluster, 'elasticsearch.cluster.id', cluster.cluster_uuid) === entSearch.clusterUuid
    );
    if (clusterIndex >= 0) {
      Reflect.set(clusters[clusterIndex], 'enterpriseSearch', {
        ...entSearch,
      });
    }
  });

  // check ccr configuration
  const isCcrEnabled = await checkCcrEnabled(req, '*');

  const kibanaUuid = req.server.instanceUuid;

  return getClustersSummary(req.server, clusters as EnhancedClusters[], kibanaUuid, isCcrEnabled);
}
