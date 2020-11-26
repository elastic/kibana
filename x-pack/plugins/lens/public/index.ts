/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LensPlugin } from './plugin';

export type LensPublicStart = ReturnType<LensPlugin['start']>;

export * from './types';
export { LensProps } from './editor_frame_service/embeddable/embeddable_component';
export { XYState } from './xy_visualization/types';
export { PieVisualizationState } from './pie_visualization/types';
export { DatatableVisualizationState } from './datatable_visualization/visualization';
export { State as MetricState } from './metric_visualization/types';
export { IndexPatternPersistedState } from './indexpattern_datasource/types';

export const plugin = () => new LensPlugin();
