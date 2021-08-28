/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FailedTransactionsCorrelationValue } from '../../../../common/search_strategies/failure_correlations/types';

interface Progress {
  started: number;
  loadedFieldCandidates: number;
  loadedErrorCorrelations: number;
}
export const asyncErrorCorrelationsSearchServiceStateProvider = () => {
  let ccsWarning = false;
  function setCcsWarning(d: boolean) {
    ccsWarning = d;
  }

  let error: Error;
  function setError(d: Error) {
    error = d;
  }

  let isCancelled = false;
  function setIsCancelled(d: boolean) {
    isCancelled = d;
  }

  let isRunning = true;
  function setIsRunning(d: boolean) {
    isRunning = d;
  }

  let progress: Progress = {
    started: Date.now(),
    loadedFieldCandidates: 0,
    loadedErrorCorrelations: 0,
  };
  function getOverallProgress() {
    return (
      progress.loadedFieldCandidates * 0.025 +
      progress.loadedErrorCorrelations * (1 - 0.025)
    );
  }
  function setProgress(d: Partial<Omit<Progress, 'started'>>) {
    progress = {
      ...progress,
      ...d,
    };
  }

  const values: FailedTransactionsCorrelationValue[] = [];
  function addValue(d: FailedTransactionsCorrelationValue) {
    values.push(d);
  }
  function addValues(d: FailedTransactionsCorrelationValue[]) {
    values.push(...d);
  }

  function getValuesSortedByScore() {
    return values.sort((a, b) => b.score - a.score);
  }

  function getState() {
    return {
      ccsWarning,
      error,
      isCancelled,
      isRunning,
      progress,
      values,
    };
  }

  return {
    addValue,
    addValues,
    getOverallProgress,
    getState,
    getValuesSortedByScore,
    setCcsWarning,
    setError,
    setIsCancelled,
    setIsRunning,
    setProgress,
  };
};

export type AsyncSearchServiceState = ReturnType<
  typeof asyncErrorCorrelationsSearchServiceStateProvider
>;
