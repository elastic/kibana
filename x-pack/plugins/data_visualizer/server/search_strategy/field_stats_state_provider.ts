/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface LatencyCorrelationSearchServiceProgress {
  started: number;
  loadedOverallStats: number;
  loadedFieldStats: number;
}

export type FieldStat = Record<string, any> | undefined;
export const fieldStatsSearchServiceStateProvider = () => {
  let ccsWarning = false;
  function setCcsWarning(d: boolean) {
    ccsWarning = d;
  }

  const errorLog: string[] = [];
  function addErrorMessage(message: string) {
    errorLog.push(message);
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

  const fieldsStats: FieldStat[] = [];
  function addFieldsStats(d: FieldStat[]) {
    fieldsStats.push(...d);
  }

  let progress: LatencyCorrelationSearchServiceProgress = {
    started: Date.now(),
    loadedOverallStats: 1,
    loadedFieldStats: 0,
  };
  function getOverallProgress() {
    return progress.loadedOverallStats * 0.1 + progress.loadedFieldStats * 0.9;
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
      fieldsStats,
      errorLog,
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
    addFieldsStats,
    addErrorMessage,
  };
};

export type LatencyCorrelationsSearchServiceState = ReturnType<
  typeof fieldStatsSearchServiceStateProvider
>;
