/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import type { DefaultEmbeddableApi, IEmbeddable } from '@kbn/embeddable-plugin/public';
import type { PublishesDataViews, PublishingSubject } from '@kbn/presentation-publishing';
import type { ChangePointDetectionViewType } from '@kbn/aiops-change-point-detection/constants';
import type { TimeRange } from '@kbn/es-query';
import type { SelectedChangePoint } from '../components/change_point_detection/change_point_detection_context';
import type {
  EmbeddableChangePointChartInput,
  EmbeddableChangePointChartOutput,
} from './embeddable_change_point_chart';
import type { EmbeddableChangePointChartProps } from './embeddable_change_point_chart_component';

export type EmbeddableChangePointChartExplicitInput = {
  title: string;
} & Omit<EmbeddableChangePointChartProps, 'timeRange'>;

export interface EditChangePointChartsPanelContext {
  embeddable: IEmbeddable<EmbeddableChangePointChartInput, EmbeddableChangePointChartOutput>;
}

export type ViewComponent = FC<{
  changePoints: SelectedChangePoint[];
  interval: string;
  onRenderComplete?: () => void;
}>;

export interface ChangePointComponentApi {
  viewType?: PublishingSubject<ChangePointDetectionViewType>;
  dataViewId: PublishingSubject<string>;
  timeRange: TimeRange;
  fn: 'avg' | 'sum' | 'min' | 'max' | string;
  metricField: string;
  splitField?: string;
  partitions?: string[];
  maxSeriesToPlot?: number;
}

export type ChangePointEmbeddableApi = DefaultEmbeddableApi &
  PublishesDataViews &
  ChangePointComponentApi;
