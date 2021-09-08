/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { latencyCorrelationsSearchServiceStateProvider } from './latency_correlations_search_service_state';

describe('search service', () => {
  describe('latencyCorrelationsSearchServiceStateProvider', () => {
    it('initializes with default state', () => {
      const state = latencyCorrelationsSearchServiceStateProvider();
      const defaultState = state.getState();
      const defaultProgress = state.getOverallProgress();

      expect(defaultState.ccsWarning).toBe(false);
      expect(defaultState.error).toBe(undefined);
      expect(defaultState.isCancelled).toBe(false);
      expect(defaultState.isRunning).toBe(true);
      expect(defaultState.overallHistogram).toBe(undefined);
      expect(defaultState.progress.loadedFieldCandidates).toBe(0);
      expect(defaultState.progress.loadedFieldValuePairs).toBe(0);
      expect(defaultState.progress.loadedHistogramStepsize).toBe(0);
      expect(defaultState.progress.loadedHistograms).toBe(0);
      expect(defaultState.progress.loadedOverallHistogram).toBe(0);
      expect(defaultState.progress.started > 0).toBe(true);

      expect(defaultProgress).toBe(0);
    });

    it('returns updated state', () => {
      const state = latencyCorrelationsSearchServiceStateProvider();

      state.setCcsWarning(true);
      state.setError(new Error('the-error-message'));
      state.setIsCancelled(true);
      state.setIsRunning(false);
      state.setOverallHistogram([{ key: 1392202800000, doc_count: 1234 }]);
      state.setProgress({ loadedHistograms: 0.5 });

      const updatedState = state.getState();
      const updatedProgress = state.getOverallProgress();

      expect(updatedState.ccsWarning).toBe(true);
      expect(updatedState.error?.message).toBe('the-error-message');
      expect(updatedState.isCancelled).toBe(true);
      expect(updatedState.isRunning).toBe(false);
      expect(updatedState.overallHistogram).toEqual([
        { key: 1392202800000, doc_count: 1234 },
      ]);
      expect(updatedState.progress.loadedFieldCandidates).toBe(0);
      expect(updatedState.progress.loadedFieldValuePairs).toBe(0);
      expect(updatedState.progress.loadedHistogramStepsize).toBe(0);
      expect(updatedState.progress.loadedHistograms).toBe(0.5);
      expect(updatedState.progress.loadedOverallHistogram).toBe(0);
      expect(updatedState.progress.started > 0).toBe(true);

      expect(updatedProgress).toBe(0.45);
    });
  });
});
