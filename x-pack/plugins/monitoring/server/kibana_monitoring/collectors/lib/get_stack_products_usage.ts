/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { MonitoringClusterUsage } from '../types';
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
} from '../../../../common/constants';
import { fetchStackProductUsage } from './fetch_stack_product_usage';
import { getCcsIndexPattern } from '../../../lib/alerts/get_ccs_index_pattern';

export const getStackProductsUsage = async (
  config: MonitoringConfig,
  callCluster: CallCluster,
  availableCcs: string[],
  clusterUuid: string
): Promise<
  Pick<MonitoringClusterUsage, 'elasticsearch' | 'kibana' | 'logstash' | 'beats' | 'apm'>
> => {
  const elasticsearchIndex = getCcsIndexPattern(INDEX_PATTERN_ELASTICSEARCH, availableCcs);
  const kibanaIndex = getCcsIndexPattern(INDEX_PATTERN_KIBANA, availableCcs);
  const logstashIndex = getCcsIndexPattern(INDEX_PATTERN_LOGSTASH, availableCcs);
  const beatsIndex = getCcsIndexPattern(INDEX_PATTERN_BEATS, availableCcs);
  const [elasticsearch, kibana, logstash, beats, apm] = await Promise.all([
    fetchESUsage(config, callCluster, clusterUuid, elasticsearchIndex),
    fetchStackProductUsage(
      config,
      callCluster,
      clusterUuid,
      kibanaIndex,
      'kibana_stats',
      'kibana_stats.kibana.uuid',
      'kibana_stats.kibana.version'
    ),
    fetchStackProductUsage(
      config,
      callCluster,
      clusterUuid,
      logstashIndex,
      'logstash_stats',
      'logstash_stats.logstash.uuid',
      'logstash_stats.logstash.version'
    ),
    fetchStackProductUsage(
      config,
      callCluster,
      clusterUuid,
      beatsIndex,
      'beats_stats',
      'beats_stats.beats.uuid',
      'beats_stats.beats.version'
    ),
    fetchStackProductUsage(
      config,
      callCluster,
      clusterUuid,
      beatsIndex,
      'beats_stats',
      'beats_stats.beats.uuid',
      'beats_stats.beats.version',
      [{ term: { 'beats_stats.beat.type': 'apm-server' } }]
    ),
  ]);

  return { elasticsearch, kibana, logstash, beats, apm };
};
