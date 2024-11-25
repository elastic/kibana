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

export interface LogRateAnalysisComponentApi {
  dataViewId: PublishingSubject<LogRateAnalysisEmbeddableState['dataViewId']>;
  updateUserInput: (update: LogRateAnalysisEmbeddableState) => void;
}

export type LogRateAnalysisEmbeddableApi = DefaultEmbeddableApi<LogRateAnalysisEmbeddableState> &
  HasEditCapabilities &
  PublishesDataViews &
  PublishesTimeRange &
  LogRateAnalysisComponentApi;

export interface LogRateAnalysisEmbeddableState extends SerializedTitles, SerializedTimeRange {
  dataViewId: string;
}

export interface LogRateAnalysisEmbeddableInitialState
  extends SerializedTitles,
    SerializedTimeRange {
  dataViewId?: string;
}

export type LogRateAnalysisEmbeddableRuntimeState = LogRateAnalysisEmbeddableState;
