/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateComparators } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import type { PatternAnalysisComponentApi, PatternAnalysisEmbeddableState } from './types';

type PatternAnalysisEmbeddableCustomState = Omit<
  PatternAnalysisEmbeddableState,
  'timeRange' | 'title' | 'description' | 'hidePanelTitles'
>;

export const initializePatternAnalysisControls = (rawState: PatternAnalysisEmbeddableState) => {
  const dataViewId = new BehaviorSubject(rawState.dataViewId);
  const fieldName = new BehaviorSubject(rawState.fieldName);
  const minimumTimeRangeOption = new BehaviorSubject(rawState.minimumTimeRangeOption);
  const randomSamplerMode = new BehaviorSubject(rawState.randomSamplerMode);
  const randomSamplerProbability = new BehaviorSubject(rawState.randomSamplerProbability);

  const updateUserInput = (update: PatternAnalysisEmbeddableCustomState) => {
    dataViewId.next(update.dataViewId);
    fieldName.next(update.fieldName);
    minimumTimeRangeOption.next(update.minimumTimeRangeOption);
    randomSamplerMode.next(update.randomSamplerMode);
    randomSamplerProbability.next(update.randomSamplerProbability);
  };

  const serializePatternAnalysisChartState = (): PatternAnalysisEmbeddableCustomState => {
    return {
      dataViewId: dataViewId.getValue(),
      fieldName: fieldName.getValue(),
      minimumTimeRangeOption: minimumTimeRangeOption.getValue(),
      randomSamplerMode: randomSamplerMode.getValue(),
      randomSamplerProbability: randomSamplerProbability.getValue(),
    };
  };

  const patternAnalysisControlsComparators: StateComparators<PatternAnalysisEmbeddableCustomState> =
    {
      dataViewId: [dataViewId, (arg) => dataViewId.next(arg)],
      fieldName: [fieldName, (arg) => fieldName.next(arg)],
      minimumTimeRangeOption: [minimumTimeRangeOption, (arg) => minimumTimeRangeOption.next(arg)],
      randomSamplerMode: [randomSamplerMode, (arg) => randomSamplerMode.next(arg)],
      randomSamplerProbability: [
        randomSamplerProbability,
        (arg) => randomSamplerProbability.next(arg),
      ],
    };

  return {
    patternAnalysisControlsApi: {
      dataViewId,
      fieldName,
      minimumTimeRangeOption,
      randomSamplerMode,
      randomSamplerProbability,
      updateUserInput,
    } as unknown as PatternAnalysisComponentApi,
    serializePatternAnalysisChartState,
    patternAnalysisControlsComparators,
  };
};
