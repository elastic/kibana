/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isEmpty } from 'lodash';
import { KIBANA_SYSTEM_ID } from '../../../../common/constants';
import { fetchHighLevelStats, handleHighLevelStatsResponse } from './get_high_level_stats';

export function rollUpTotals(rolledUp, addOn, field) {
  return { total: rolledUp[field].total + addOn[field].total };
}

/*
 * @param {Object} rawStats
 */
export function getUsageStats(rawStats) {
  const clusterIndexCache = [];
  const rawStatsHits = get(rawStats, 'hits.hits', []);
  const usageStatsByCluster = rawStatsHits.reduce((accum, currInstance) => {
    const clusterUuid = get(currInstance, '_source.cluster_uuid');
    const currUsage = get(currInstance, '_source.kibana_stats.usage', {});
    const clusterIndexCombination = clusterUuid + currUsage.index;

    // add usage data to the result if this cluster/index has not been processed yet
    if (isEmpty(currUsage) || clusterIndexCache.includes(clusterIndexCombination)) {
      return accum;
    }

    const rolledUpStats = get(accum, clusterUuid);
    if (rolledUpStats) {
      // this cluster has been seen, but this index hasn't
      // process the usage stats for the unique index of this cluster
      return {
        ...accum,
        [clusterUuid]: {
          dashboard: rollUpTotals(rolledUpStats, currUsage, 'dashboard'),
          visualization: rollUpTotals(rolledUpStats, currUsage, 'visualization'),
          search: rollUpTotals(rolledUpStats, currUsage, 'search'),
          index_pattern: rollUpTotals(rolledUpStats, currUsage, 'index_pattern'),
          graph_workspace: rollUpTotals(rolledUpStats, currUsage, 'graph_workspace'),
          timelion_sheet: rollUpTotals(rolledUpStats, currUsage, 'timelion_sheet'),
          indices: ++rolledUpStats.indices
        }
      };
    }

    clusterIndexCache.push(clusterIndexCombination);

    // add the usage stats for the unique cluster
    return {
      ...accum,
      [clusterUuid]: {
        dashboard: currUsage.dashboard,
        visualization: currUsage.visualization,
        search: currUsage.search,
        index_pattern: currUsage.index_pattern,
        graph_workspace: currUsage.graph_workspace,
        timelion_sheet: currUsage.timelion_sheet,
        indices: 1
      }
    };
  }, {});

  return usageStatsByCluster;
}

export function combineStats(highLevelStats, usageStats = {}) {
  return Object.keys(highLevelStats).reduce((accum, currClusterUuid) => {
    return {
      ...accum,
      [currClusterUuid]: {
        ...highLevelStats[currClusterUuid],
        ...usageStats[currClusterUuid]
      }
    };
  }, {});
}

/*
 * Monkey-patch the modules from get_high_level_stats and add in the
 * specialized usage data that comes with kibana stats (kibana_stats.usage).
 */
export async function getKibanaStats(server, callCluster, clusterUuids, start, end) {
  const rawStats = await fetchHighLevelStats(server, callCluster, clusterUuids, start, end, KIBANA_SYSTEM_ID);
  const highLevelStats = handleHighLevelStatsResponse(rawStats, KIBANA_SYSTEM_ID);
  const usageStats = getUsageStats(rawStats);
  const stats = combineStats(highLevelStats, usageStats);

  return stats;
}

