/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AsyncSearchProviderProgress,
  SearchServiceValue,
} from '../../../../common/search_strategies/correlations/types';

import { HistogramItem } from './queries';

export const asyncSearchServiceStateProvider = () => {
  let ccsWarning = false;
  function setCcsWarning(d: boolean) {
    ccsWarning = d;
  }

  let error: Error;
  function setError(d: Error) {
    error = d;
  }

  let isCancelled = false;
  function getIsCancelled() {
    return isCancelled;
  }
  function setIsCancelled(d: boolean) {
    isCancelled = d;
  }

  let isRunning = true;
  function setIsRunning(d: boolean) {
    isRunning = d;
  }

  let overallHistogram: HistogramItem[] | undefined;
  function setOverallHistogram(d: HistogramItem[]) {
    overallHistogram = d;
  }

  let percentileThresholdValue: number;
  function setPercentileThresholdValue(d: number) {
    percentileThresholdValue = d;
  }

  let progress: AsyncSearchProviderProgress = {
    started: Date.now(),
    loadedHistogramStepsize: 0,
    loadedOverallHistogram: 0,
    loadedFieldCanditates: 0,
    loadedFieldValuePairs: 0,
    loadedHistograms: 0,
  };
  function getOverallProgress() {
    return (
      progress.loadedHistogramStepsize * 0.025 +
      progress.loadedOverallHistogram * 0.025 +
      progress.loadedFieldCanditates * 0.025 +
      progress.loadedFieldValuePairs * 0.025 +
      progress.loadedHistograms * 0.9
    );
  }
  function setProgress(
    d: Partial<Omit<AsyncSearchProviderProgress, 'started'>>
  ) {
    progress = {
      ...progress,
      ...d,
    };
  }

  const values: SearchServiceValue[] = [];
  function addValue(d: SearchServiceValue) {
    values.push(d);
  }

  function getValuesSortedByCorrelation() {
    return values.sort((a, b) => b.correlation - a.correlation);
  }

  function getState() {
    return {
      ccsWarning,
      error,
      isCancelled,
      isRunning,
      overallHistogram,
      percentileThresholdValue,
      progress,
      values,
    };
  }

  return {
    addValue,
    getIsCancelled,
    getOverallProgress,
    getState,
    getValuesSortedByCorrelation,
    setCcsWarning,
    setError,
    setIsCancelled,
    setIsRunning,
    setOverallHistogram,
    setPercentileThresholdValue,
    setProgress,
  };
};

export type AsyncSearchServiceState = ReturnType<
  typeof asyncSearchServiceStateProvider
>;
