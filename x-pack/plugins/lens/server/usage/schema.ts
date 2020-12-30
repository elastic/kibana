/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MakeSchemaFrom } from 'src/plugins/usage_collection/server';
import { LensUsage } from './types';

const eventsSchema: MakeSchemaFrom<LensUsage['events_30_days']> = {
  app_query_change: { type: 'long' },
  indexpattern_field_info_click: { type: 'long' },
  loaded: { type: 'long' },
  app_filters_updated: { type: 'long' },
  app_date_change: { type: 'long' },
  save_failed: { type: 'long' },
  loaded_404: { type: 'long' },
  drop_total: { type: 'long' },
  chart_switch: { type: 'long' },
  suggestion_confirmed: { type: 'long' },
  suggestion_clicked: { type: 'long' },
  drop_onto_workspace: { type: 'long' },
  drop_non_empty: { type: 'long' },
  drop_empty: { type: 'long' },
  indexpattern_changed: { type: 'long' },
  indexpattern_filters_cleared: { type: 'long' },
  indexpattern_type_filter_toggled: { type: 'long' },
  indexpattern_existence_toggled: { type: 'long' },
  indexpattern_show_all_fields_clicked: { type: 'long' },
  drop_onto_dimension: { type: 'long' },
  indexpattern_dimension_removed: { type: 'long' },
  indexpattern_dimension_field_changed: { type: 'long' },
  xy_change_layer_display: { type: 'long' },
  xy_layer_removed: { type: 'long' },
  xy_layer_added: { type: 'long' },
  indexpattern_dimension_operation_terms: { type: 'long' },
  indexpattern_dimension_operation_date_histogram: { type: 'long' },
  indexpattern_dimension_operation_avg: { type: 'long' },
  indexpattern_dimension_operation_min: { type: 'long' },
  indexpattern_dimension_operation_max: { type: 'long' },
  indexpattern_dimension_operation_sum: { type: 'long' },
  indexpattern_dimension_operation_count: { type: 'long' },
  indexpattern_dimension_operation_cardinality: { type: 'long' },
  indexpattern_dimension_operation_filters: { type: 'long' },
};

const suggestionEventsSchema: MakeSchemaFrom<LensUsage['suggestion_events_30_days']> = {
  back_to_current: { type: 'long' },
  reload: { type: 'long' },
};

const savedSchema: MakeSchemaFrom<LensUsage['saved_overall']> = {
  bar: { type: 'long' },
  bar_horizontal: { type: 'long' },
  line: { type: 'long' },
  area: { type: 'long' },
  bar_stacked: { type: 'long' },
  bar_percentage_stacked: { type: 'long' },
  bar_horizontal_stacked: { type: 'long' },
  bar_horizontal_percentage_stacked: { type: 'long' },
  area_stacked: { type: 'long' },
  area_percentage_stacked: { type: 'long' },
  lnsDatatable: { type: 'long' },
  lnsPie: { type: 'long' },
  lnsMetric: { type: 'long' },
};

export const lensUsageSchema: MakeSchemaFrom<LensUsage> = {
  // LensClickUsage
  events_30_days: eventsSchema,
  events_90_days: eventsSchema,
  suggestion_events_30_days: suggestionEventsSchema,
  suggestion_events_90_days: suggestionEventsSchema,

  // LensVisualizationUsage
  saved_overall_total: { type: 'long' },
  saved_30_days_total: { type: 'long' },
  saved_90_days_total: { type: 'long' },

  saved_overall: savedSchema,
  saved_30_days: savedSchema,
  saved_90_days: savedSchema,
};
