/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PRECISION_ERROR_ACCURACY_MODE_ENABLED = 'layer_settings_accuracy_mode_enabled';
export const PRECISION_ERROR_ACCURACY_MODE_DISABLED = 'layer_settings_accuracy_mode_disabled';
export const PRECISION_ERROR_ASC_COUNT_PRECISION = 'precision_error_asc_count_precision';
export const TSDB_UNSUPPORTED_COUNTER_OP = 'tsdb_unsupported_counter_op';
export const LAYER_SETTINGS_RANDOM_SAMPLING_INFO = 'random_sampling_info';
export const LAYER_SETTINGS_IGNORE_GLOBAL_FILTERS = 'ignoring-global-filters-layers';
export const EDITOR_MISSING_VIS_TYPE = 'editor_missing_vis_type';
export const EDITOR_UNKNOWN_VIS_TYPE = 'editor_unknown_vis_type';
export const EDITOR_UNKNOWN_DATASOURCE_TYPE = 'editor_unknown_datasource_type';
export const EDITOR_MISSING_DATAVIEW = 'editor_missing_dataview';
export const EDITOR_MISSING_EXPRESSION_DATAVIEW = 'editor_missing_expression_dataview';
export const TIMESHIFT_LT_INTERVAL = 'timeshift_smaller_then_interval';
export const TIMESHIFT_NOT_MULTIPLE_INTERVAL = 'timeshift_not_multiple_interval';

/** Annotations require a time based chart to work. Add a date histogram. */
export const ANNOTATION_MISSING_DATE_HISTOGRAM = 'annotation_missing_date_histogram';
export const ANNOTATION_MISSING_TIME_FIELD = 'annotation_missing_time_field';
export const ANNOTATION_MISSING_TOOLTIP_FIELD = 'annotation_missing_tooltip_field';
export const ANNOTATION_TIME_FIELD_NOT_FOUND = 'annotation_time_field_not_found_in_dataview';
export const ANNOTATION_TEXT_FIELD_NOT_FOUND = 'annotation_text_field_not_found_in_dataview';
export const ANNOTATION_INVALID_FILTER_QUERY = 'annotation_invalid_filter_query';

export const XY_BREAKDOWN_MISSING_AXIS = 'xy_breakdown_missing_axis';
export const XY_Y_MISSING_AXIS = 'xy_y_missing_axis';
export const XY_X_WRONG_DATA_TYPE = 'xy_x_wrong_data_type';
export const XY_Y_WRONG_DATA_TYPE = 'xy_y_wrong_data_type';
export const XY_RENDER_ARRAY_VALUES = 'xy_rendering_values_array';
export const XY_MIXED_LOG_SCALE = 'xy_mixed_log_scale-groupid-';
export const XY_MIXED_LOG_SCALE_DIMENSION = 'xy_mixed_log_scale-dimension-';

export const PIE_TOO_MANY_DIMENSIONS = 'pie_too_many_dimensions';
export const PIE_RENDER_ARRAY_VALUES = 'pie_rendering_values_array';

export const WAFFLE_SMALL_VALUES = 'waffle_small_values';

export const METRIC_NUMERIC_MAX = 'metric_max_numeric';

export const HEATMAP_X_MISSING_AXIS = 'heatmap_x_missing_axis';
export const HEATMAP_RENDER_ARRAY_VALUES = 'heatmap_rendering_values_array';

export const GAUGE_MIN_GT_MAX = 'gauge_min_gt_max';
export const GAUGE_MIN_GT_METRIC = 'gauge_min_gt_metric';
export const GAUGE_MIN_GT_GOAL = 'gauge_min_gt_goal';
export const GAUGE_MIN_NE_MAX = 'gauge_min_ne_max';
export const GAUGE_METRIC_GT_MAX = 'gauge_metric_gt_max';
export const GAUGE_GOAL_GT_MAX = 'gauge_goal_gt_max';

export const TEXT_BASED_LANGUAGE_ERROR = 'text_based_lang_error';
