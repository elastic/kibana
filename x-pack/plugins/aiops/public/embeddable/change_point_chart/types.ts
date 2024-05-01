/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import type { DefaultEmbeddableApi, IEmbeddable } from '@kbn/embeddable-plugin/public';
import type {
  HasEditCapabilities,
  PublishesDataViews,
  PublishesTimeRange,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import type { ChangePointDetectionViewType } from '@kbn/aiops-change-point-detection/constants';
import type { TimeRange } from '@kbn/es-query';
import type { SelectedChangePoint } from '../../components/change_point_detection/change_point_detection_context';
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
  viewType: PublishingSubject<ChangePointEmbeddableState['viewType']>;
  dataViewId: PublishingSubject<ChangePointEmbeddableState['dataViewId']>;
  fn: PublishingSubject<ChangePointEmbeddableState['fn']>;
  metricField: PublishingSubject<ChangePointEmbeddableState['metricField']>;
  splitField: PublishingSubject<ChangePointEmbeddableState['splitField']>;
  partitions: PublishingSubject<ChangePointEmbeddableState['partitions']>;
  maxSeriesToPlot: PublishingSubject<ChangePointEmbeddableState['maxSeriesToPlot']>;
  updateUserInput: (update: ChangePointEmbeddableState) => void;
}

export type ChangePointEmbeddableApi = DefaultEmbeddableApi<ChangePointEmbeddableState> &
  HasEditCapabilities &
  PublishesDataViews &
  PublishesTimeRange &
  ChangePointComponentApi;

export interface ChangePointEmbeddableState {
  viewType: ChangePointDetectionViewType;
  dataViewId: string;
  timeRange?: TimeRange | undefined;
  fn: 'avg' | 'sum' | 'min' | 'max' | string;
  metricField: string;
  splitField?: string;
  partitions?: string[];
  maxSeriesToPlot?: number;
}

export type ChangePointEmbeddableRuntimeState = ChangePointEmbeddableState;
