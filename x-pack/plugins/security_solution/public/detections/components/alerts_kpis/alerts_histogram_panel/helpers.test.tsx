/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { showInitialLoadingSpinner, formatAlertsData, EMPTY_VALUE_LABEL } from './helpers';

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

  describe('formatAlertsData', () => {
    test('it should add an empty value label in case the value for a field is empty', () => {
      const formattedAlertData = formatAlertsData(alertsDataWithoutValue);
      expect(formattedAlertData[0].g).toBe(EMPTY_VALUE_LABEL);
    });
  });
});

const alertsDataWithoutValue = {
  took: 1,
  timeout: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 1000,
      relation: '',
    },
    hits: [],
  },
  aggregations: {
    alertsByGrouping: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: '',
          doc_count: 52,
          alerts: {
            buckets: [
              {
                key_as_string: '2021-11-15T12:00:40.782Z',
                key: 1636977640782,
                doc_count: 34,
              },
            ],
          },
        },
      ],
    },
  },
};
