/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MakeSchemaFrom } from 'src/plugins/usage_collection/server';
import { LensUsage } from './types';

const eventsSchema: MakeSchemaFrom<LensUsage['events_30_days']> = {
  app_query_change: { type: 'long' },
  open_help_popover: {
    type: 'long',
    _meta: { description: 'Number of times the user opened one of the in-product help popovers.' },
  },
  error_fix_action: {
    type: 'long',
    _meta: {
      description:
        'Number of times the user used the fix action of an error displayed in the workspace.',
    },
  },
  open_formula_popover: {
    type: 'long',
    _meta: { description: 'Number of times the user opened the in-product formula help popover.' },
  },
  toggle_autoapply: {
    type: 'long',
    _meta: {
      description: 'Number of times the user toggled auto-apply.',
    },
  },
  toggle_fullscreen_formula: {
    type: 'long',
    _meta: {
      description: 'Number of times the user toggled fullscreen mode on formula.',
    },
  },
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
  open_field_editor_edit: {
    type: 'long',
    _meta: {
      description:
        'Number of times the user opened the editor flyout to edit a field from within Lens.',
    },
  },
  open_field_editor_add: {
    type: 'long',
    _meta: {
      description:
        'Number of times the user opened the editor flyout to add a field from within Lens.',
    },
  },
  save_field_edit: {
    type: 'long',
    _meta: {
      description: 'Number of times the user edited a field from within Lens.',
    },
  },
  save_field_add: {
    type: 'long',
    _meta: {
      description: 'Number of times the user added a field from within Lens.',
    },
  },
  open_field_delete_modal: {
    type: 'long',
    _meta: {
      description: 'Number of times the user opened the field delete modal from within Lens.',
    },
  },
  delete_field: {
    type: 'long',
    _meta: {
      description: 'Number of times the user deleted a field from within Lens.',
    },
  },
  indexpattern_dimension_operation_terms: {
    type: 'long',
    _meta: {
      description: 'Number of times the top values function was selected',
    },
  },
  indexpattern_dimension_operation_date_histogram: {
    type: 'long',
    _meta: {
      description: 'Number of times the date histogram function was selected',
    },
  },
  indexpattern_dimension_operation_avg: {
    type: 'long',
    _meta: {
      description: 'Number of times the average function was selected',
    },
  },
  indexpattern_dimension_operation_min: {
    type: 'long',
    _meta: {
      description: 'Number of times the min function was selected',
    },
  },
  indexpattern_dimension_operation_max: {
    type: 'long',
    _meta: {
      description: 'Number of times the max function was selected',
    },
  },
  indexpattern_dimension_operation_sum: {
    type: 'long',
    _meta: {
      description: 'Number of times the sum function was selected',
    },
  },
  indexpattern_dimension_operation_count: {
    type: 'long',
    _meta: {
      description: 'Number of times the count function was selected',
    },
  },
  indexpattern_dimension_operation_cardinality: {
    type: 'long',
    _meta: {
      description: 'Number of times the cardinality function was selected',
    },
  },
  indexpattern_dimension_operation_filters: {
    type: 'long',
    _meta: {
      description: 'Number of times the filters function was selected',
    },
  },
  indexpattern_dimension_operation_range: {
    type: 'long',
    _meta: { description: 'Number of times the range function was selected' },
  },
  indexpattern_dimension_operation_median: {
    type: 'long',
    _meta: { description: 'Number of times the median function was selected' },
  },
  indexpattern_dimension_operation_percentile: {
    type: 'long',
    _meta: { description: 'Number of times the percentile function was selected' },
  },
  indexpattern_dimension_operation_last_value: {
    type: 'long',
    _meta: { description: 'Number of times the last value function was selected' },
  },
  indexpattern_dimension_operation_cumulative_sum: {
    type: 'long',
    _meta: { description: 'Number of times the cumulative sum function was selected' },
  },
  indexpattern_dimension_operation_counter_rate: {
    type: 'long',
    _meta: { description: 'Number of times the counter rate function was selected' },
  },
  indexpattern_dimension_operation_derivative: {
    type: 'long',
    _meta: { description: 'Number of times the derivative function was selected' },
  },
  indexpattern_dimension_operation_moving_average: {
    type: 'long',
    _meta: { description: 'Number of times the moving average function was selected' },
  },
  indexpattern_dimension_operation_formula: {
    type: 'long',
    _meta: { description: 'Number of times the formula function was selected' },
  },
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
  formula: {
    type: 'long',
    _meta: {
      description: 'Number of saved lens visualizations which are using at least one formula',
    },
  },
};

const savedMultitermsSchema: MakeSchemaFrom<LensUsage['saved_multiterms_overall']> = {
  multiterms_docs: {
    type: 'long',
    _meta: {
      description:
        'Number of saved lens visualizations which are using at least one multiterms operation',
    },
  },
  multiterms_terms_count: {
    type: 'long',
    _meta: {
      description: 'Sum of terms used for multiterms operations of saved lens visualizations',
    },
  },
  multiterms_operations_count: {
    type: 'long',
    _meta: {
      description: 'Sum of operations using multiterms of saved lens visualizations',
    },
  },
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

  saved_multiterms_overall: savedMultitermsSchema,
  saved_multiterms_30_days: savedMultitermsSchema,
  saved_multiterms_90_days: savedMultitermsSchema,
};
