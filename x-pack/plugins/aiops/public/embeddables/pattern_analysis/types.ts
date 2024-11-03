/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type {
  HasEditCapabilities,
  PublishesDataViews,
  PublishesTimeRange,
  PublishingSubject,
  SerializedTimeRange,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import type { FC } from 'react';
import type { MinimumTimeRangeOption } from '../../components/log_categorization/log_categorization_for_embeddable/minimum_time_range';
import type {
  RandomSamplerOption,
  RandomSamplerProbability,
} from '../../components/log_categorization/sampling_menu/random_sampler';

export type ViewComponent = FC<{
  interval: string;
  onRenderComplete?: () => void;
}>;

export interface PatternAnalysisComponentApi {
  dataViewId: PublishingSubject<PatternAnalysisEmbeddableState['dataViewId']>;
  fieldName: PublishingSubject<PatternAnalysisEmbeddableState['fieldName']>;
  minimumTimeRangeOption: PublishingSubject<
    PatternAnalysisEmbeddableState['minimumTimeRangeOption']
  >;
  randomSamplerMode: PublishingSubject<PatternAnalysisEmbeddableState['randomSamplerMode']>;
  randomSamplerProbability: PublishingSubject<
    PatternAnalysisEmbeddableState['randomSamplerProbability']
  >;
  updateUserInput: (update: PatternAnalysisEmbeddableState) => void;
}

export type PatternAnalysisEmbeddableApi = DefaultEmbeddableApi<PatternAnalysisEmbeddableState> &
  HasEditCapabilities &
  PublishesDataViews &
  PublishesTimeRange &
  PatternAnalysisComponentApi;

export interface PatternAnalysisEmbeddableState extends SerializedTitles, SerializedTimeRange {
  dataViewId: string;
  fieldName: string | undefined;
  minimumTimeRangeOption: MinimumTimeRangeOption;
  randomSamplerMode: RandomSamplerOption;
  randomSamplerProbability: RandomSamplerProbability;
}

export interface PatternAnalysisEmbeddableInitialState
  extends SerializedTitles,
    SerializedTimeRange {
  dataViewId?: string;
}

export type PatternAnalysisEmbeddableRuntimeState = PatternAnalysisEmbeddableState;
