/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, omit } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
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
  CCS_REMOTE_PATTERN,
} from '../../../common/constants';

import { getApmsForClusters } from '../apm/get_apms_for_clusters';
import { checkCcrEnabled } from '../elasticsearch/ccr';
import { fetchStatus } from '../alerts/fetch_status';
import { getStandaloneClusterDefinition, hasStandaloneClusters } from '../standalone_clusters';
import { getLogTypes } from '../logs';
import { isInCodePath } from './is_in_code_path';
import { LegacyRequest, Cluster } from '../../types';
import { RulesByType } from '../../../common/types/alerts';
import { getClusterRuleDataForClusters, getInstanceRuleDataForClusters } from '../kibana/rules';
import { Globals } from '../../static_globals';
import { getIndexPatterns } from './get_index_patterns';

import { findMonitoredClustersQuery } from './find_monitored_clusters_query';

function getAlertState(req: LegacyRequest, alertStatus: any, clusterUuid: string) {
  const rulesClient = req.getRulesClient();
  if (!rulesClient) {
    return {
      list: {},
      alertsMeta: {
        enabled: false,
      },
    };
  }

  try {
    return {
      list: Object.keys(alertStatus).reduce<RulesByType>((acc, ruleTypeName) => {
        acc[ruleTypeName] = alertStatus[ruleTypeName].map((rule: any) => ({
          ...rule,
          states: rule.states.filter(
            (state: any) => state.state.cluster.clusterUuid === clusterUuid
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
    return {
      list: {},
      alertsMeta: {
        enabled: true,
      },
    };
  }
}

/**
 * returns lightweight informations of the clusters monitored
 */
export async function findMonitoredClusters(req: LegacyRequest) {
  const indexPattern = [
    '.monitoring-*',
    'metrics-elasticsearch.stack_monitoring.*',
    'metrics-kibana.stack_monitoring.*',
    'metrics-logstash.stack_monitoring.*',
    'metrics-beats.stack_monitoring.*',
  ].join(',');

  const params = {
    index: indexPattern,
    size: 0,
    ignore_unavailable: true,
    body: findMonitoredClustersQuery({
      start: req.payload.timeRange.min,
      end: req.payload.timeRange.max,
    }),
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const result = await callWithRequest(req, 'search', params);

  if (!result.aggregations) {
    return [];
  }

  const { buckets } = result.aggregations.cluster_uuid;
  const clusterUuids = buckets.map((bucket: any) => bucket.key);

  const rulesClient = req.getRulesClient();
  const alertStatus = await fetchStatus(rulesClient, undefined, clusterUuids);

  return result.aggregations.cluster_uuid.buckets.map((bucket: any) => {
    const {
      key: cluster_uuid,
      elasticsearch,
      kibana,
      beats,
      logstash,
      apm,
      enterprisesearch,
    } = bucket;

    const alerts = getAlertState(req, alertStatus, cluster_uuid);
    return {
      isSupported: true,
      cluster_uuid,
      cluster_name:
        elasticsearch.latest_doc.hits.hits[0]?._source.elasticsearch.cluster?.name ?? cluster_uuid,
      license:
        elasticsearch.latest_doc.hits.hits[0]?._source.elasticsearch.cluster?.stats?.license ?? {},
      alerts,
      elasticsearch: {
        count:
          elasticsearch.latest_doc.hits.hits[0]?._source.elasticsearch.cluster?.stats?.nodes
            .count ?? 0,
      },
      kibana: { count: kibana.instance_count.value },
      apm: { count: apm.instance_count.value },
      beats: { count: beats.instance_count.value },
      logstash: { count: logstash.instance_count.value },
      enterprisesearch: { count: enterprisesearch.instance_count.value },
    };
  });
}

/**
 * Get all clusters or the cluster associated with {@code clusterUuid} when it is defined.
 */
export async function getClustersFromRequest(
  req: LegacyRequest,
  {
    clusterUuid,
    start,
    end,
    codePaths,
  }: { clusterUuid?: string; start?: number; end?: number; codePaths: string[] }
) {
  const logsIndexPattern = getIndexPatterns({
    config: Globals.app.config,
    type: 'logs',
    moduleType: 'elasticsearch',
    ccs: CCS_REMOTE_PATTERN,
  });

  const isStandaloneCluster = clusterUuid === STANDALONE_CLUSTER_CLUSTER_UUID;

  let clusters: Cluster[] = [];

  if (isStandaloneCluster) {
    clusters.push(getStandaloneClusterDefinition());
  } else {
    // get clusters with stats and cluster state
    clusters = await getClustersStats(req, clusterUuid, CCS_REMOTE_PATTERN);
    if (!clusters.length) {
      clusters.push({ cluster_uuid: clusterUuid!, license: {}, isSupported: true });
    }
  }

  if (!clusterUuid && !isStandaloneCluster) {
    if (await hasStandaloneClusters(req, CCS_REMOTE_PATTERN)) {
      clusters.push(getStandaloneClusterDefinition());
    }
  }

  // TODO: this handling logic should be two different functions
  if (clusterUuid) {
    const cluster = clusters[0];

    // add ml jobs and alerts data
    const mlJobs = isInCodePath(codePaths, [CODE_PATH_ML])
      ? await getMlJobsForCluster(req, cluster, CCS_REMOTE_PATTERN)
      : null;
    if (mlJobs !== null) {
      cluster.ml = { jobs: mlJobs };
    }

    cluster.logs =
      start && end && isInCodePath(codePaths, [CODE_PATH_LOGS])
        ? await getLogTypes(req, logsIndexPattern, {
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
    const getSupportedClusters = flagSupportedClusters(req, CCS_REMOTE_PATTERN);
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
        cluster.alerts = getAlertState(
          req,
          alertStatus,
          get(cluster, 'elasticsearch.cluster.id', cluster.cluster_uuid)
        );
      }
    }
  }
  // add kibana data
  const [kibanas, kibanaClusterRules, kibanaInstanceRules] =
    isInCodePath(codePaths, [CODE_PATH_KIBANA]) && !isStandaloneCluster
      ? await Promise.all([
          getKibanasForClusters(req, clusters, CCS_REMOTE_PATTERN),
          getClusterRuleDataForClusters(req, clusters, CCS_REMOTE_PATTERN),
          getInstanceRuleDataForClusters(req, clusters, CCS_REMOTE_PATTERN),
        ])
      : [[], [], []];
  // add the kibana data to each cluster
  kibanas.forEach((kibana) => {
    const clusterIndex = clusters.findIndex(
      (cluster) =>
        get(cluster, 'elasticsearch.cluster.id', cluster.cluster_uuid) === kibana.clusterUuid
    );
    set(clusters[clusterIndex], 'kibana', kibana.stats);

    const clusterKibanaRules = kibanaClusterRules.every((rule) => !Boolean(rule))
      ? null
      : kibanaClusterRules?.find((rule) => rule?.clusterUuid === kibana.clusterUuid);
    const instanceKibanaRules = kibanaInstanceRules.every((rule) => !Boolean(rule))
      ? null
      : kibanaInstanceRules?.find((rule) => rule?.clusterUuid === kibana.clusterUuid);
    set(
      clusters[clusterIndex],
      'kibana.rules.cluster',
      clusterKibanaRules ? omit(clusterKibanaRules, 'clusterUuid') : null
    );
    set(
      clusters[clusterIndex],
      'kibana.rules.instance',
      instanceKibanaRules ? omit(instanceKibanaRules, 'clusterUuid') : null
    );
  });

  // add logstash data
  if (isInCodePath(codePaths, [CODE_PATH_LOGSTASH])) {
    const logstashes = await getLogstashForClusters(req, clusters, CCS_REMOTE_PATTERN);
    const pipelines = await getLogstashPipelineIds({
      req,
      clusterUuid,
      size: 1,
      ccs: CCS_REMOTE_PATTERN,
    });
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
    ? await getBeatsForClusters(req, clusters, CCS_REMOTE_PATTERN)
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
    ? await getApmsForClusters(req, clusters, CCS_REMOTE_PATTERN)
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
    ? await getEnterpriseSearchForClusters(req, clusters, CCS_REMOTE_PATTERN)
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
  const isCcrEnabled = await checkCcrEnabled(req, CCS_REMOTE_PATTERN);

  const kibanaUuid = req.server.instanceUuid;

  return getClustersSummary(req.server, clusters as EnhancedClusters[], kibanaUuid, isCcrEnabled);
}
