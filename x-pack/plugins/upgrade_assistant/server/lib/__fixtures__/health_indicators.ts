/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export const diskIndicatorGreen: estypes.HealthReportDiskIndicator = {
  status: 'green',
  symptom: 'The cluster has enough available disk space.',
  details: {
    indices_with_readonly_block: 0,
    nodes_with_enough_disk_space: 1,
    nodes_with_unknown_disk_status: 0,
    nodes_over_high_watermark: 0,
    nodes_over_flood_stage_watermark: 0,
  },
};

export const diskIndicatorUnknown: estypes.HealthReportDiskIndicator = {
  status: 'unknown',
  symptom: 'No disk usage data.',
};

export const diskIndicatorRed: estypes.HealthReportDiskIndicator = {
  status: 'red',
  symptom: 'The cluster does not have enough available disk space.',
  details: {
    indices_with_readonly_block: 1,
    nodes_with_enough_disk_space: 1,
    nodes_with_unknown_disk_status: 1,
    nodes_over_high_watermark: 1,
    nodes_over_flood_stage_watermark: 1,
  },
};

export const shardCapacityIndicatorGreen = {
  status: 'green',
  symptom: 'The cluster has enough room to add new shards.',
  details: { data: '[Object]', frozen: '[Object]' },
};

export const shardCapacityIndicatorRed = {
  status: 'red',
  symptom: 'Cluster is close to reaching the configured maximum number of shards for data nodes.',
  details: {
    data: { max_shards_in_cluster: 9, current_used_shards: 23 },
    frozen: { max_shards_in_cluster: 3000 },
  },
  impacts: [
    {
      id: 'elasticsearch:health:shards_capacity:impact:upgrade_blocked',
      severity: 1,
      description: 'The cluster has too many used shards to be able to upgrade.',
      impact_areas: '[Array]',
    },
    {
      id: 'elasticsearch:health:shards_capacity:impact:creation_of_new_indices_blocked',
      severity: 1,
      description:
        'The cluster is running low on room to add new shards. Adding data to new indices is at risk',
      impact_areas: '[Array]',
    },
  ],
  diagnosis: [
    {
      id: 'elasticsearch:health:shards_capacity:diagnosis:increase_max_shards_per_node',
      cause:
        'Elasticsearch is about to reach the maximum number of shards it can host, based on your current settings.',
      action:
        'Increase the value of [cluster.max_shards_per_node] cluster setting or remove data indices to clear up resources.',
      help_url: 'https://ela.st/fix-shards-capacity',
    },
  ],
};
