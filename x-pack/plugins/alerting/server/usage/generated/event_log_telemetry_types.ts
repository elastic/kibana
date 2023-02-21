/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ---------------------------------- WARNING ----------------------------------
// this file was generated, and should not be edited by hand
// ---------------------------------- WARNING ----------------------------------

import { cloneDeep } from 'lodash';
import { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type {
  AggregationsPercentilesAggregateBase,
  AggregationsSingleMetricAggregateBase,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { byTypeSchema } from '../by_type_schema';

export interface EventLogUsageSchema {
  avg_event_duration_per_day: AvgValueSchema;
  avg_kibana_task_schedule_delay_per_day: AvgValueSchema;
  percentile_number_of_triggered_actions_per_day: PercentileValueSchema;
  percentile_number_of_generated_actions_per_day: PercentileValueSchema;
  percentile_alert_counts_active_per_day: PercentileValueSchema;
  percentile_alert_counts_new_per_day: PercentileValueSchema;
  percentile_alert_counts_recovered_per_day: PercentileValueSchema;
  avg_number_of_searches_per_day: AvgValueSchema;
  avg_total_indexing_duration_ms_per_day: AvgValueSchema;
  avg_es_search_duration_ms_per_day: AvgValueSchema;
  avg_total_search_duration_ms_per_day: AvgValueSchema;
  avg_execution_gap_duration_s_per_day: AvgValueSchema;
  avg_rule_type_run_duration_ms_per_day: AvgValueSchema;
  avg_process_alerts_duration_ms_per_day: AvgValueSchema;
  avg_trigger_actions_duration_ms_per_day: AvgValueSchema;
  avg_process_rule_duration_ms_per_day: AvgValueSchema;
  avg_claim_to_start_duration_ms_per_day: AvgValueSchema;
  avg_prepare_rule_duration_ms_per_day: AvgValueSchema;
  avg_total_run_duration_ms_per_day: AvgValueSchema;
  avg_total_enrichment_duration_ms_per_day: AvgValueSchema;
}
export interface EventLogUsageByTypeSchema {
  avg_event_duration_by_type_per_day: AvgValueByTypeSchema;
  avg_kibana_task_schedule_delay_by_type_per_day: AvgValueByTypeSchema;
  percentile_number_of_triggered_actions_by_type_per_day: PercentileValueByTypeSchema;
  percentile_number_of_generated_actions_by_type_per_day: PercentileValueByTypeSchema;
  percentile_alert_counts_active_by_type_per_day: PercentileValueByTypeSchema;
  percentile_alert_counts_new_by_type_per_day: PercentileValueByTypeSchema;
  percentile_alert_counts_recovered_by_type_per_day: PercentileValueByTypeSchema;
  avg_number_of_searches_by_type_per_day: AvgValueByTypeSchema;
  avg_total_indexing_duration_ms_by_type_per_day: AvgValueByTypeSchema;
  avg_es_search_duration_ms_by_type_per_day: AvgValueByTypeSchema;
  avg_total_search_duration_ms_by_type_per_day: AvgValueByTypeSchema;
  avg_execution_gap_duration_s_by_type_per_day: AvgValueByTypeSchema;
  avg_rule_type_run_duration_ms_by_type_per_day: AvgValueByTypeSchema;
  avg_process_alerts_duration_ms_by_type_per_day: AvgValueByTypeSchema;
  avg_trigger_actions_duration_ms_by_type_per_day: AvgValueByTypeSchema;
  avg_process_rule_duration_ms_by_type_per_day: AvgValueByTypeSchema;
  avg_claim_to_start_duration_ms_by_type_per_day: AvgValueByTypeSchema;
  avg_prepare_rule_duration_ms_by_type_per_day: AvgValueByTypeSchema;
  avg_total_run_duration_ms_by_type_per_day: AvgValueByTypeSchema;
  avg_total_enrichment_duration_ms_by_type_per_day: AvgValueByTypeSchema;
}

export type EventLogUsage = EventLogUsageSchema & EventLogUsageByTypeSchema;

export type AvgValueSchema = number;
export type AvgValueByTypeSchema = Record<string, number>;
export interface PercentileValueSchema {
  p50: number;
  p90: number;
  p99: number;
}
export interface PercentileValueByTypeSchema {
  p50: Record<string, number>;
  p90: Record<string, number>;
  p99: Record<string, number>;
}

export const EmptyEventLogUsage = {
  avg_event_duration_per_day: 0,
  avg_kibana_task_schedule_delay_per_day: 0,
  percentile_number_of_triggered_actions_per_day: {
    p50: 0,
    p90: 0,
    p99: 0,
  },
  percentile_number_of_generated_actions_per_day: {
    p50: 0,
    p90: 0,
    p99: 0,
  },
  percentile_alert_counts_active_per_day: {
    p50: 0,
    p90: 0,
    p99: 0,
  },
  percentile_alert_counts_new_per_day: {
    p50: 0,
    p90: 0,
    p99: 0,
  },
  percentile_alert_counts_recovered_per_day: {
    p50: 0,
    p90: 0,
    p99: 0,
  },
  avg_number_of_searches_per_day: 0,
  avg_total_indexing_duration_ms_per_day: 0,
  avg_es_search_duration_ms_per_day: 0,
  avg_total_search_duration_ms_per_day: 0,
  avg_execution_gap_duration_s_per_day: 0,
  avg_rule_type_run_duration_ms_per_day: 0,
  avg_process_alerts_duration_ms_per_day: 0,
  avg_trigger_actions_duration_ms_per_day: 0,
  avg_process_rule_duration_ms_per_day: 0,
  avg_claim_to_start_duration_ms_per_day: 0,
  avg_prepare_rule_duration_ms_per_day: 0,
  avg_total_run_duration_ms_per_day: 0,
  avg_total_enrichment_duration_ms_per_day: 0,
};

export const getEmptyEventLogUsage = () => cloneDeep(EmptyEventLogUsage);

export const EmptyEventLogUsageByType = {
  avg_event_duration_by_type_per_day: {},
  avg_kibana_task_schedule_delay_by_type_per_day: {},
  percentile_number_of_triggered_actions_by_type_per_day: {
    p50: {},
    p90: {},
    p99: {},
  },
  percentile_number_of_generated_actions_by_type_per_day: {
    p50: {},
    p90: {},
    p99: {},
  },
  percentile_alert_counts_active_by_type_per_day: {
    p50: {},
    p90: {},
    p99: {},
  },
  percentile_alert_counts_new_by_type_per_day: {
    p50: {},
    p90: {},
    p99: {},
  },
  percentile_alert_counts_recovered_by_type_per_day: {
    p50: {},
    p90: {},
    p99: {},
  },
  avg_number_of_searches_by_type_per_day: {},
  avg_total_indexing_duration_ms_by_type_per_day: {},
  avg_es_search_duration_ms_by_type_per_day: {},
  avg_total_search_duration_ms_by_type_per_day: {},
  avg_execution_gap_duration_s_by_type_per_day: {},
  avg_rule_type_run_duration_ms_by_type_per_day: {},
  avg_process_alerts_duration_ms_by_type_per_day: {},
  avg_trigger_actions_duration_ms_by_type_per_day: {},
  avg_process_rule_duration_ms_by_type_per_day: {},
  avg_claim_to_start_duration_ms_by_type_per_day: {},
  avg_prepare_rule_duration_ms_by_type_per_day: {},
  avg_total_run_duration_ms_by_type_per_day: {},
  avg_total_enrichment_duration_ms_by_type_per_day: {},
};

export const getEmptyEventLogUsageByType = () => cloneDeep(EmptyEventLogUsageByType);

const byPercentileSchema: MakeSchemaFrom<PercentileValueSchema> = {
  p50: { type: 'long' },
  p90: { type: 'long' },
  p99: { type: 'long' },
};

const byPercentileSchemaByType: MakeSchemaFrom<PercentileValueByTypeSchema> = {
  p50: byTypeSchema,
  p90: byTypeSchema,
  p99: byTypeSchema,
};

export const EventLogUsageMapping: MakeSchemaFrom<EventLogUsage> = {
  avg_event_duration_per_day: { type: 'long' },
  avg_event_duration_by_type_per_day: byTypeSchema,
  avg_kibana_task_schedule_delay_per_day: { type: 'long' },
  avg_kibana_task_schedule_delay_by_type_per_day: byTypeSchema,
  percentile_number_of_triggered_actions_per_day: byPercentileSchema,
  percentile_number_of_triggered_actions_by_type_per_day: byPercentileSchemaByType,
  percentile_number_of_generated_actions_per_day: byPercentileSchema,
  percentile_number_of_generated_actions_by_type_per_day: byPercentileSchemaByType,
  percentile_alert_counts_active_per_day: byPercentileSchema,
  percentile_alert_counts_active_by_type_per_day: byPercentileSchemaByType,
  percentile_alert_counts_new_per_day: byPercentileSchema,
  percentile_alert_counts_new_by_type_per_day: byPercentileSchemaByType,
  percentile_alert_counts_recovered_per_day: byPercentileSchema,
  percentile_alert_counts_recovered_by_type_per_day: byPercentileSchemaByType,
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

export const EventLogUsageAggregations = {
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
  percentile_number_of_triggered_actions: {
    percentiles: {
      field: 'kibana.alert.rule.execution.metrics.number_of_triggered_actions',
      percents: [50, 90, 99],
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
  percentile_alert_counts_new: {
    percentiles: {
      field: 'kibana.alert.rule.execution.metrics.alert_counts.new',
      percents: [50, 90, 99],
    },
  },
  percentile_alert_counts_recovered: {
    percentiles: {
      field: 'kibana.alert.rule.execution.metrics.alert_counts.recovered',
      percents: [50, 90, 99],
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

export interface EventLogUsageAggregationType {
  avg_event_duration: AggregationsSingleMetricAggregateBase;
  avg_kibana_task_schedule_delay: AggregationsSingleMetricAggregateBase;
  percentile_number_of_triggered_actions: AggregationsPercentilesAggregateBase;
  percentile_number_of_generated_actions: AggregationsPercentilesAggregateBase;
  percentile_alert_counts_active: AggregationsPercentilesAggregateBase;
  percentile_alert_counts_new: AggregationsPercentilesAggregateBase;
  percentile_alert_counts_recovered: AggregationsPercentilesAggregateBase;
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
