/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { MonitoringClusterStackProductUsage } from '../types';
import { fetchESUsage } from './fetch_es_usage';
import { MonitoringConfig } from '../../../config';
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
  callCluster: ElasticsearchClient,
  availableCcs: boolean,
  clusterUuid: string
): Promise<
  Pick<
    MonitoringClusterStackProductUsage,
    'elasticsearch' | 'kibana' | 'logstash' | 'beats' | 'apm'
  >
> => {
  const elasticsearchIndex = getCcsIndexPattern(INDEX_PATTERN_ELASTICSEARCH, availableCcs);
  const kibanaIndex = getCcsIndexPattern(INDEX_PATTERN_KIBANA, availableCcs);
  const logstashIndex = getCcsIndexPattern(INDEX_PATTERN_LOGSTASH, availableCcs);
  const beatsIndex = getCcsIndexPattern(INDEX_PATTERN_BEATS, availableCcs);
  const [elasticsearch, kibana, logstash, beats, apm] = await Promise.all([
    fetchESUsage(callCluster, clusterUuid, elasticsearchIndex),
    fetchStackProductUsage(
      config,
      callCluster,
      clusterUuid,
      kibanaIndex,
      'kibana_stats',
      'kibana_stats.kibana.uuid'
    ),
    fetchStackProductUsage(
      config,
      callCluster,
      clusterUuid,
      logstashIndex,
      'logstash_stats',
      'logstash_stats.logstash.uuid'
    ),
    fetchStackProductUsage(
      config,
      callCluster,
      clusterUuid,
      beatsIndex,
      'beats_stats',
      'beats_stats.beat.uuid'
    ),
    fetchStackProductUsage(
      config,
      callCluster,
      clusterUuid,
      beatsIndex,
      'beats_stats',
      'beats_stats.beat.uuid',
      [{ term: { 'beats_stats.beat.type': 'apm-server' } }]
    ),
  ]);

  return { elasticsearch, kibana, logstash, beats, apm };
};
