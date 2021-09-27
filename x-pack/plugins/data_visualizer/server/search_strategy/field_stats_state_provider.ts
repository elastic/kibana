/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStart as DataPluginStart } from '../../../../../src/plugins/data/server';

export interface LatencyCorrelationSearchServiceProgress {
  started: number;
  loadedHistogramStepsize: number;
  loadedOverallHistogram: number;
  loadedFieldCandidates: number;
  loadedFieldValuePairs: number;
  loadedHistograms: number;
}

export const fieldStatsSearchServiceStateProvider = (dataPlugin: DataPluginStart) => {
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
  function setProgress(d: Partial<Omit<LatencyCorrelationSearchServiceProgress, 'started'>>) {
    progress = {
      ...progress,
      ...d,
    };
  }

  function getState() {
    return {
      ccsWarning,
      error,
      isCancelled,
      isRunning,
      progress,
    };
  }

  return {
    getIsCancelled,
    getOverallProgress,
    getState,
    setCcsWarning,
    setError,
    setIsCancelled,
    setIsRunning,
    setProgress,
  };
};

export type LatencyCorrelationsSearchServiceState = ReturnType<
  typeof fieldStatsSearchServiceStateProvider
>;
