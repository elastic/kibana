/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ---------------------------------- WARNING ----------------------------------
// this file was generated, and should not be edited by hand
// ---------------------------------- WARNING ----------------------------------

import { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type {
  AggregationsPercentilesAggregateBase,
  AggregationsSingleMetricAggregateBase,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { byTypeSchema } from '../by_type_schema';

export interface EventUsageSchema {
  avg_event_duration_per_day: AvgSchema;
  avg_kibana_task_schedule_delay_per_day: AvgSchema;
  avg_number_of_triggered_actions_per_day: AvgSchema;
  percentile_number_of_generated_actions_per_day: PercentileSchema;
  percentile_alert_counts_active_per_day: PercentileSchema;
  avg_alert_counts_new_per_day: AvgSchema;
  avg_alert_counts_recovered_per_day: AvgSchema;
  avg_number_of_searches_per_day: AvgSchema;
  avg_total_indexing_duration_ms_per_day: AvgSchema;
  avg_es_search_duration_ms_per_day: AvgSchema;
  avg_total_search_duration_ms_per_day: AvgSchema;
  avg_execution_gap_duration_s_per_day: AvgSchema;
  avg_rule_type_run_duration_ms_per_day: AvgSchema;
  avg_process_alerts_duration_ms_per_day: AvgSchema;
  avg_trigger_actions_duration_ms_per_day: AvgSchema;
  avg_process_rule_duration_ms_per_day: AvgSchema;
  avg_claim_to_start_duration_ms_per_day: AvgSchema;
  avg_prepare_rule_duration_ms_per_day: AvgSchema;
  avg_total_run_duration_ms_per_day: AvgSchema;
  avg_total_enrichment_duration_ms_per_day: AvgSchema;
}
export interface EventUsageByTypeSchema {
  avg_event_duration_by_type_per_day: AvgByTypeSchema;
  avg_kibana_task_schedule_delay_by_type_per_day: AvgByTypeSchema;
  avg_number_of_triggered_actions_by_type_per_day: AvgByTypeSchema;
  percentile_number_of_generated_actions_by_type_per_day: PercentileByTypeSchema;
  percentile_alert_counts_active_by_type_per_day: PercentileByTypeSchema;
  avg_alert_counts_new_by_type_per_day: AvgByTypeSchema;
  avg_alert_counts_recovered_by_type_per_day: AvgByTypeSchema;
  avg_number_of_searches_by_type_per_day: AvgByTypeSchema;
  avg_total_indexing_duration_ms_by_type_per_day: AvgByTypeSchema;
  avg_es_search_duration_ms_by_type_per_day: AvgByTypeSchema;
  avg_total_search_duration_ms_by_type_per_day: AvgByTypeSchema;
  avg_execution_gap_duration_s_by_type_per_day: AvgByTypeSchema;
  avg_rule_type_run_duration_ms_by_type_per_day: AvgByTypeSchema;
  avg_process_alerts_duration_ms_by_type_per_day: AvgByTypeSchema;
  avg_trigger_actions_duration_ms_by_type_per_day: AvgByTypeSchema;
  avg_process_rule_duration_ms_by_type_per_day: AvgByTypeSchema;
  avg_claim_to_start_duration_ms_by_type_per_day: AvgByTypeSchema;
  avg_prepare_rule_duration_ms_by_type_per_day: AvgByTypeSchema;
  avg_total_run_duration_ms_by_type_per_day: AvgByTypeSchema;
  avg_total_enrichment_duration_ms_by_type_per_day: AvgByTypeSchema;
}

export type EventSchema = EventUsageSchema & EventUsageByTypeSchema;

export type AvgSchema = number;
export type AvgByTypeSchema = Record<string, number>;
export interface PercentileSchema {
  p50: number;
  p90: number;
  p99: number;
}
export interface PercentileByTypeSchema {
  p50: Record<string, number>;
  p90: Record<string, number>;
  p99: Record<string, number>;
}

export const EmptyEventUsage = {
  avg_event_duration_per_day: 0,
  avg_event_duration_by_type_per_day: {},
  avg_kibana_task_schedule_delay_per_day: 0,
  avg_kibana_task_schedule_delay_by_type_per_day: {},
  avg_number_of_triggered_actions_per_day: 0,
  avg_number_of_triggered_actions_by_type_per_day: {},
  percentile_number_of_generated_actions_per_day: {
    p50: 0,
    p90: 0,
    p99: 0,
  },
  percentile_number_of_generated_actions_by_type_per_day: {
    p50: {},
    p90: {},
    p99: {},
  },
  percentile_alert_counts_active_per_day: {
    p50: 0,
    p90: 0,
    p99: 0,
  },
  percentile_alert_counts_active_by_type_per_day: {
    p50: {},
    p90: {},
    p99: {},
  },
  avg_alert_counts_new_per_day: 0,
  avg_alert_counts_new_by_type_per_day: {},
  avg_alert_counts_recovered_per_day: 0,
  avg_alert_counts_recovered_by_type_per_day: {},
  avg_number_of_searches_per_day: 0,
  avg_number_of_searches_by_type_per_day: {},
  avg_total_indexing_duration_ms_per_day: 0,
  avg_total_indexing_duration_ms_by_type_per_day: {},
  avg_es_search_duration_ms_per_day: 0,
  avg_es_search_duration_ms_by_type_per_day: {},
  avg_total_search_duration_ms_per_day: 0,
  avg_total_search_duration_ms_by_type_per_day: {},
  avg_execution_gap_duration_s_per_day: 0,
  avg_execution_gap_duration_s_by_type_per_day: {},
  avg_rule_type_run_duration_ms_per_day: 0,
  avg_rule_type_run_duration_ms_by_type_per_day: {},
  avg_process_alerts_duration_ms_per_day: 0,
  avg_process_alerts_duration_ms_by_type_per_day: {},
  avg_trigger_actions_duration_ms_per_day: 0,
  avg_trigger_actions_duration_ms_by_type_per_day: {},
  avg_process_rule_duration_ms_per_day: 0,
  avg_process_rule_duration_ms_by_type_per_day: {},
  avg_claim_to_start_duration_ms_per_day: 0,
  avg_claim_to_start_duration_ms_by_type_per_day: {},
  avg_prepare_rule_duration_ms_per_day: 0,
  avg_prepare_rule_duration_ms_by_type_per_day: {},
  avg_total_run_duration_ms_per_day: 0,
  avg_total_run_duration_ms_by_type_per_day: {},
  avg_total_enrichment_duration_ms_per_day: 0,
  avg_total_enrichment_duration_ms_by_type_per_day: {},
};

const byPercentileSchema: MakeSchemaFrom<PercentileSchema> = {
  p50: { type: 'long' },
  p90: { type: 'long' },
  p99: { type: 'long' },
};

const byPercentileSchemaByType: MakeSchemaFrom<PercentileByTypeSchema> = {
  p50: byTypeSchema,
  p90: byTypeSchema,
  p99: byTypeSchema,
};

export const EventUsageMapping = {
  avg_event_duration_per_day: { type: 'long' },
  avg_event_duration_by_type_per_day: byTypeSchema,
  avg_kibana_task_schedule_delay_per_day: { type: 'long' },
  avg_kibana_task_schedule_delay_by_type_per_day: byTypeSchema,
  avg_number_of_triggered_actions_per_day: { type: 'long' },
  avg_number_of_triggered_actions_by_type_per_day: byTypeSchema,
  percentile_number_of_generated_actions_per_day: byPercentileSchema,
  percentile_number_of_generated_actions_by_type_per_day: byPercentileSchemaByType,
  percentile_alert_counts_active_per_day: byPercentileSchema,
  percentile_alert_counts_active_by_type_per_day: byPercentileSchemaByType,
  avg_alert_counts_new_per_day: { type: 'long' },
  avg_alert_counts_new_by_type_per_day: byTypeSchema,
  avg_alert_counts_recovered_per_day: { type: 'long' },
  avg_alert_counts_recovered_by_type_per_day: byTypeSchema,
  avg_number_of_searches_per_day: { type: 'long' },
  avg_number_of_searches_by_type_per_day: byTypeSchema,
  avg_total_indexing_duration_ms_per_day: { type: 'long' },
  avg_total_indexing_duration_ms_by_type_per_day: byTypeSchema,
  avg_es_search_duration_ms_per_day: { type: 'long' },
  avg_es_search_duration_ms_by_type_per_day: byTypeSchema,
  avg_total_search_duration_ms_per_day: { type: 'long' },
  avg_total_search_duration_ms_by_type_per_day: byTypeSchema,
  avg_execution_gap_duration_s_per_day: { type: 'long' },
  avg_execution_gap_duration_s_by_type_per_day: byTypeSchema,
  avg_rule_type_run_duration_ms_per_day: { type: 'long' },
  avg_rule_type_run_duration_ms_by_type_per_day: byTypeSchema,
  avg_process_alerts_duration_ms_per_day: { type: 'long' },
  avg_process_alerts_duration_ms_by_type_per_day: byTypeSchema,
  avg_trigger_actions_duration_ms_per_day: { type: 'long' },
  avg_trigger_actions_duration_ms_by_type_per_day: byTypeSchema,
  avg_process_rule_duration_ms_per_day: { type: 'long' },
  avg_process_rule_duration_ms_by_type_per_day: byTypeSchema,
  avg_claim_to_start_duration_ms_per_day: { type: 'long' },
  avg_claim_to_start_duration_ms_by_type_per_day: byTypeSchema,
  avg_prepare_rule_duration_ms_per_day: { type: 'long' },
  avg_prepare_rule_duration_ms_by_type_per_day: byTypeSchema,
  avg_total_run_duration_ms_per_day: { type: 'long' },
  avg_total_run_duration_ms_by_type_per_day: byTypeSchema,
  avg_total_enrichment_duration_ms_per_day: { type: 'long' },
  avg_total_enrichment_duration_ms_by_type_per_day: byTypeSchema,
};

export const EventUsageAggregations = {
  avg_event_duration: {
    avg: {
      field: 'event.duration',
    },
  },
  avg_kibana_task_schedule_delay: {
    avg: {
      field: 'kibana.task.schedule_delay',
    },
  },
  avg_number_of_triggered_actions: {
    avg: {
      field: 'kibana.alert.rule.execution.metrics.number_of_triggered_actions',
    },
  },
  percentile_number_of_generated_actions: {
    percentiles: {
      field: 'kibana.alert.rule.execution.metrics.number_of_generated_actions',
      percents: [50, 90, 99],
    },
  },
  percentile_alert_counts_active: {
    percentiles: {
      field: 'kibana.alert.rule.execution.metrics.alert_counts.active',
      percents: [50, 90, 99],
    },
  },
  avg_alert_counts_new: {
    avg: {
      field: 'kibana.alert.rule.execution.metrics.alert_counts.new',
    },
  },
  avg_alert_counts_recovered: {
    avg: {
      field: 'kibana.alert.rule.execution.metrics.alert_counts.recovered',
    },
  },
  avg_number_of_searches: {
    avg: {
      field: 'kibana.alert.rule.execution.metrics.number_of_searches',
    },
  },
  avg_total_indexing_duration_ms: {
    avg: {
      field: 'kibana.alert.rule.execution.metrics.total_indexing_duration_ms',
    },
  },
  avg_es_search_duration_ms: {
    avg: {
      field: 'kibana.alert.rule.execution.metrics.es_search_duration_ms',
    },
  },
  avg_total_search_duration_ms: {
    avg: {
      field: 'kibana.alert.rule.execution.metrics.total_search_duration_ms',
    },
  },
  avg_execution_gap_duration_s: {
    avg: {
      field: 'kibana.alert.rule.execution.metrics.execution_gap_duration_s',
    },
  },
  avg_rule_type_run_duration_ms: {
    avg: {
      field: 'kibana.alert.rule.execution.metrics.rule_type_run_duration_ms',
    },
  },
  avg_process_alerts_duration_ms: {
    avg: {
      field: 'kibana.alert.rule.execution.metrics.process_alerts_duration_ms',
    },
  },
  avg_trigger_actions_duration_ms: {
    avg: {
      field: 'kibana.alert.rule.execution.metrics.trigger_actions_duration_ms',
    },
  },
  avg_process_rule_duration_ms: {
    avg: {
      field: 'kibana.alert.rule.execution.metrics.process_rule_duration_ms',
    },
  },
  avg_claim_to_start_duration_ms: {
    avg: {
      field: 'kibana.alert.rule.execution.metrics.claim_to_start_duration_ms',
    },
  },
  avg_prepare_rule_duration_ms: {
    avg: {
      field: 'kibana.alert.rule.execution.metrics.prepare_rule_duration_ms',
    },
  },
  avg_total_run_duration_ms: {
    avg: {
      field: 'kibana.alert.rule.execution.metrics.total_run_duration_ms',
    },
  },
  avg_total_enrichment_duration_ms: {
    avg: {
      field: 'kibana.alert.rule.execution.metrics.total_enrichment_duration_ms',
    },
  },
};

export interface EventUsageAggregationType {
  avg_event_duration: AggregationsSingleMetricAggregateBase;
  avg_kibana_task_schedule_delay: AggregationsSingleMetricAggregateBase;
  avg_number_of_triggered_actions: AggregationsSingleMetricAggregateBase;
  percentile_number_of_generated_actions: AggregationsPercentilesAggregateBase;
  percentile_alert_counts_active: AggregationsPercentilesAggregateBase;
  avg_alert_counts_new: AggregationsSingleMetricAggregateBase;
  avg_alert_counts_recovered: AggregationsSingleMetricAggregateBase;
  avg_number_of_searches: AggregationsSingleMetricAggregateBase;
  avg_total_indexing_duration_ms: AggregationsSingleMetricAggregateBase;
  avg_es_search_duration_ms: AggregationsSingleMetricAggregateBase;
  avg_total_search_duration_ms: AggregationsSingleMetricAggregateBase;
  avg_execution_gap_duration_s: AggregationsSingleMetricAggregateBase;
  avg_rule_type_run_duration_ms: AggregationsSingleMetricAggregateBase;
  avg_process_alerts_duration_ms: AggregationsSingleMetricAggregateBase;
  avg_trigger_actions_duration_ms: AggregationsSingleMetricAggregateBase;
  avg_process_rule_duration_ms: AggregationsSingleMetricAggregateBase;
  avg_claim_to_start_duration_ms: AggregationsSingleMetricAggregateBase;
  avg_prepare_rule_duration_ms: AggregationsSingleMetricAggregateBase;
  avg_total_run_duration_ms: AggregationsSingleMetricAggregateBase;
  avg_total_enrichment_duration_ms: AggregationsSingleMetricAggregateBase;
}
