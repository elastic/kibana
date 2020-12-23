/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LensPlugin } from './plugin';

export {
  EmbeddableComponentProps,
  TypedLensByValueInput,
} from './editor_frame_service/embeddable/embeddable_component';
export type { XYState } from './xy_visualization/types';
export type { PieVisualizationState } from './pie_visualization/types';
export type { DatatableVisualizationState } from './datatable_visualization/visualization';
export type { State as MetricState } from './metric_visualization/types';
export type { IndexPatternPersistedState } from './indexpattern_datasource/types';
export { LensPublicStart } from './plugin';

export const plugin = () => new LensPlugin();
