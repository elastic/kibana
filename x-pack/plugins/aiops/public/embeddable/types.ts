/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEmbeddable } from '@kbn/embeddable-plugin/public';
import {
  EmbeddableChangePointChartInput,
  EmbeddableChangePointChartOutput,
} from './embeddable_change_point_chart';
import { EmbeddableChangePointChartProps } from './embeddable_change_point_chart_component';

export type EmbeddableChangePointChartExplicitInput = {
  title: string;
} & Omit<EmbeddableChangePointChartProps, 'timeRange'>;

export interface EditChangePointChartsPanelContext {
  embeddable: IEmbeddable<EmbeddableChangePointChartInput, EmbeddableChangePointChartOutput>;
}
