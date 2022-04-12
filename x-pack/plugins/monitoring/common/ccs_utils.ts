/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { MonitoringConfig } from '../server/config';

/**
 * Prefix all comma separated index patterns within the original {@code indexPattern}.
 *
 * Cross-cluster search (CCS) prefixing is ignored if the user has disabled CCS via kibana.yml,
 * which means that the index pattern will be returned without using {@code ccs}.
 *
 * @param  {Object} config The Kibana configuration object.
 * @param  {String} indexPattern The index pattern name
 * @param  {Array|String} ccs The optional cluster-prefixes to prepend. An array when passed from config
 * and a string when passed from a request.  This is optional because the request could be empty if its not a remote cluster
 * @return {String} The index pattern with the {@code cluster} prefix appropriately prepended.
 */
export function prefixIndexPatternWithCcs(
  config: MonitoringConfig,
  indexPattern: string,
  ccs?: string[] | string
) {
  const ccsEnabled = config.ui.ccs.enabled;
  if (!ccsEnabled || !ccs) {
    return indexPattern;
  }

  const patterns = indexPattern.split(',');
  // for each index pattern prefix with each remote ccs pattern
  const prefixedPattern = patterns
    .map((pattern) =>
      Array.isArray(ccs) ? ccs.map((ccsValue) => `${ccsValue}:${pattern}`) : `${ccs}:${pattern}`
    )
    .join(',');

  // if a wildcard is used, then we also want to search the local indices.
  if (ccs.includes('*')) {
    // this case is met when user does not set monitoring.ui.ccs.remotePatterns and uses default ([*])
    // or user explicitly sets monitoring.ui.ccs to '*'
    return `${prefixedPattern},${indexPattern}`;
  }
  return prefixedPattern;
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
export function parseCrossClusterPrefix(indexName: string) {
  const colonIndex = indexName.indexOf(':');

  if (colonIndex === -1) {
    return null;
  }

  // if we found a : in the index name, then cross-cluster search (CCS) was used to find the cluster
  // and we _should_ use it when we search explicitly for this cluster (to avoid inefficiently checking other monitoring _clusters_)
  return indexName.substr(0, colonIndex);
}
