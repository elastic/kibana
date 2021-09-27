/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregate } from '@elastic/elasticsearch/api/types';

export interface LatencyCorrelationSearchServiceProgress {
  started: number;
  loadedOverallStats: number;
  loadedFieldStats: number;
}

type FieldStat = Record<string, AggregationsAggregate> | undefined;
export const fieldStatsSearchServiceStateProvider = () => {
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

  const fieldsStats: FieldStat[] = [];
  function addFieldStats(d: FieldStat) {
    fieldsStats.push(d);
  }

  let progress: LatencyCorrelationSearchServiceProgress = {
    started: Date.now(),
    loadedOverallStats: 0,
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
    addFieldStats,
  };
};

export type LatencyCorrelationsSearchServiceState = ReturnType<
  typeof fieldStatsSearchServiceStateProvider
>;
