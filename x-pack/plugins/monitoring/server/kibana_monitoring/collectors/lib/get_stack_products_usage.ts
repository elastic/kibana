/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { StackProductUsage } from '../types';
import { fetchESUsage } from './fetch_es_usage';
import { MonitoringConfig } from '../../../config';
// @ts-ignore
import { getIndexPatterns } from '../../../lib/cluster/get_index_patterns';
// @ts-ignore
import { prefixIndexPattern } from '../../../lib/ccs_utils';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  INDEX_PATTERN_KIBANA,
  INDEX_PATTERN_LOGSTASH,
  INDEX_PATTERN_BEATS,
  KIBANA_SYSTEM_ID,
  LOGSTASH_SYSTEM_ID,
  BEATS_SYSTEM_ID,
} from '../../../../common/constants';
import { fetchClusters } from '../../../lib/alerts/fetch_clusters';
import { fetchStackProductUsage } from './fetch_stack_product_usage';

export const getStackProductsUsage = async (
  config: MonitoringConfig,
  callCluster: CallCluster
): Promise<StackProductUsage[]> => {
  const usage = [];
  const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, '*');
  const clusters = await fetchClusters(callCluster, esIndexPattern);
  for (const cluster of clusters) {
    const clusterUsage = await Promise.all([
      fetchESUsage(config, callCluster, cluster.clusterUuid),
      fetchStackProductUsage(
        config,
        callCluster,
        cluster.clusterUuid,
        INDEX_PATTERN_KIBANA,
        KIBANA_SYSTEM_ID,
        'kibana_stats',
        'kibana_stats.kibana.uuid',
        'kibana_stats.kibana.version'
      ),
      fetchStackProductUsage(
        config,
        callCluster,
        cluster.clusterUuid,
        INDEX_PATTERN_LOGSTASH,
        LOGSTASH_SYSTEM_ID,
        'logstash_stats',
        'logstash_stats.logstash.uuid',
        'logstash_stats.logstash.version'
      ),
      fetchStackProductUsage(
        config,
        callCluster,
        cluster.clusterUuid,
        INDEX_PATTERN_BEATS,
        BEATS_SYSTEM_ID,
        'beats_stats',
        'beats_stats.beats.uuid',
        'beats_stats.beats.version'
      ),
    ]);

    usage.push(...clusterUsage);
  }
  return usage;
};
