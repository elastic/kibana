/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { showInitialLoadingSpinner } from './helpers';

describe('helpers', () => {
  describe('showInitialLoadingSpinner', () => {
    test('it should (only) show the spinner during initial loading, while we are fetching data', () => {
      expect(showInitialLoadingSpinner({ isInitialLoading: true, isLoadingAlerts: true })).toBe(
        true
      );
    });

    test('it should STOP showing the spinner (during initial loading) when the first data fetch completes', () => {
      expect(showInitialLoadingSpinner({ isInitialLoading: true, isLoadingAlerts: false })).toBe(
        false
      );
    });

    test('it should NOT show the spinner after initial loading has completed, even if the user requests more data (e.g. by clicking Refresh)', () => {
      expect(showInitialLoadingSpinner({ isInitialLoading: false, isLoadingAlerts: true })).toBe(
        false
      );
    });

    test('it should NOT show the spinner after initial loading has completed', () => {
      expect(showInitialLoadingSpinner({ isInitialLoading: false, isLoadingAlerts: false })).toBe(
        false
      );
    });
  });
});
