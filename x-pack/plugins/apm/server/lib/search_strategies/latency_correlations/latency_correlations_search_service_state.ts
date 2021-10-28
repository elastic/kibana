/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HistogramItem } from '../../../../common/search_strategies/types';
import type {
  LatencyCorrelationSearchServiceProgress,
  LatencyCorrelation,
} from '../../../../common/search_strategies/latency_correlations/types';
import { FieldStats } from '../../../../common/search_strategies/field_stats_types';

export const latencyCorrelationsSearchServiceStateProvider = () => {
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

  let progress: LatencyCorrelationSearchServiceProgress = {
    started: Date.now(),
    loadedHistogramStepsize: 0,
    loadedOverallHistogram: 0,
    loadedFieldCandidates: 0,
    loadedFieldValuePairs: 0,
    loadedHistograms: 0,
  };
  function getOverallProgress() {
    return (
      progress.loadedHistogramStepsize * 0.025 +
      progress.loadedOverallHistogram * 0.025 +
      progress.loadedFieldCandidates * 0.025 +
      progress.loadedFieldValuePairs * 0.025 +
      progress.loadedHistograms * 0.9
    );
  }
  function setProgress(
    d: Partial<Omit<LatencyCorrelationSearchServiceProgress, 'started'>>
  ) {
    progress = {
      ...progress,
      ...d,
    };
  }

  const latencyCorrelations: LatencyCorrelation[] = [];
  function addLatencyCorrelation(d: LatencyCorrelation) {
    latencyCorrelations.push(d);
  }

  function getLatencyCorrelationsSortedByCorrelation() {
    return latencyCorrelations.sort((a, b) => b.correlation - a.correlation);
  }
  const fieldStats: FieldStats[] = [];
  function addFieldStats(stats: FieldStats[]) {
    fieldStats.push(...stats);
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
      latencyCorrelations,
      fieldStats,
    };
  }

  return {
    addLatencyCorrelation,
    getIsCancelled,
    getOverallProgress,
    getState,
    getLatencyCorrelationsSortedByCorrelation,
    setCcsWarning,
    setError,
    setIsCancelled,
    setIsRunning,
    setOverallHistogram,
    setPercentileThresholdValue,
    setProgress,
    addFieldStats,
  };
};

export type LatencyCorrelationsSearchServiceState = ReturnType<
  typeof latencyCorrelationsSearchServiceStateProvider
>;
