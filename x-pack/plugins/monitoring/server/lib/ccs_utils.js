/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isFunction, get } from 'lodash';

export function appendMetricbeatIndex(config, indexPattern, bypass = false) {
  if (bypass) {
    return indexPattern;
  }
  // Leverage this function to also append the dynamic metricbeat index too
  let mbIndex = null;
  // TODO: NP
  // This function is called with both NP config and LP config
  if (isFunction(config.get)) {
    mbIndex = config.get('monitoring.ui.metricbeat.index');
  } else {
    mbIndex = get(config, 'ui.metricbeat.index');
  }

  return `${indexPattern},${mbIndex}`;
}

/**
 * Prefix all comma separated index patterns within the original {@code indexPattern}.
 *
 * Cross-cluster search (CCS) prefixing is ignored if the user has disabled CCS via kibana.yml,
 * which means that the index pattern will be returned without using {@code ccs}.
 *
 * @param  {Object} config The Kibana configuration object.
 * @param  {String} indexPattern The index pattern name
 * @param  {String} ccs The optional cluster-prefix to prepend.
 * @return {String} The index pattern with the {@code cluster} prefix appropriately prepended.
 */
export function prefixIndexPattern(config, indexPattern, ccs, monitoringIndicesOnly = false) {
  let ccsEnabled = false;
  // TODO: NP
  // This function is called with both NP config and LP config
  if (isFunction(config.get)) {
    ccsEnabled = config.get('monitoring.ui.ccs.enabled');
  } else {
    ccsEnabled = get(config, 'monitoring.ui.ccs.enabled');
  }

  if (!ccsEnabled || !ccs) {
    return appendMetricbeatIndex(config, indexPattern, monitoringIndicesOnly);
  }

  const patterns = indexPattern.split(',');
  const prefixedPattern = patterns.map((pattern) => `${ccs}:${pattern}`).join(',');

  // if a wildcard is used, then we also want to search the local indices
  if (ccs === '*') {
    return appendMetricbeatIndex(
      config,
      `${prefixedPattern},${indexPattern}`,
      monitoringIndicesOnly
    );
  }

  return appendMetricbeatIndex(config, prefixedPattern, monitoringIndicesOnly);
}

/**
 * Parse the cross-cluster prefix from an index name returned as part of a hit from Elasticsearch.
 *
 * For example, the first hit should return 'my_cluster', while the second hit should return null:
 *
 * {
 *   hits: {
 *     total: 2,
 *     hits: [
 *       {
 *         _index: my_cluster:.monitoring-es-6-2017.07.28,
 *         _type: doc,
 *         _id: xyz456,
 *         _source: { ... }
 *       },
 *       {
 *         _index: .monitoring-es-6-2017.07.28,
 *         _type: doc,
 *         _id: abc123,
 *         _source: { ... }
 *       }
 *     ]
 *   }
 * }
 *
 * @param  {String} indexName The index's name, possibly including the cross-cluster prefix
 * @return {String} {@code null} if none. Otherwise the cluster prefix.
 */
export function parseCrossClusterPrefix(indexName) {
  const colonIndex = indexName.indexOf(':');

  if (colonIndex === -1) {
    return null;
  }

  // if we found a : in the index name, then cross-cluster search (CCS) was used to find the cluster
  // and we _should_ use it when we search explicitly for this cluster (to avoid inefficiently checking other monitoring _clusters_)
  return indexName.substr(0, colonIndex);
}
