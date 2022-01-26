/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This file re-exports all parts of visualizations and datasources which can be loaded lazily
 * (to reduce page load bundle size) when Lens is actually accessed via editor or embeddable.
 *
 * It's also possible for each visualization and datasource to resolve this locally, but this causes
 * a burst of bundles being loaded on Lens startup at once (and in some scenarios cascading bundle loads).
 * This file causes all of them to be served in a single request.
 */

export * from './datatable_visualization/datatable_visualization';
export * from './datatable_visualization';
export * from './metric_visualization/metric_visualization';
export * from './metric_visualization';
export * from './pie_visualization/pie_visualization';
export * from './pie_visualization';
export * from './xy_visualization/xy_visualization';
export * from './xy_visualization';
export * from './heatmap_visualization/heatmap_visualization';
export * from './heatmap_visualization';
export * from './visualizations/gauge/gauge_visualization';
export * from './visualizations/gauge';

export * from './indexpattern_datasource/indexpattern';
export { createFormulaPublicApi } from './indexpattern_datasource/operations/definitions/formula/formula_public_api';

export * from './indexpattern_datasource';

export * from './editor_frame_service/editor_frame';
export * from './editor_frame_service';
export * from './embeddable';
export * from './app_plugin/mounter';
export * from './lens_attribute_service';
export * from './lens_ui_telemetry';
export * from './app_plugin/save_modal_container';
