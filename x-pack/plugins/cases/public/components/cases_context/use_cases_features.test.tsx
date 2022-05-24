/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useCasesFeatures, UseCasesFeatures } from './use_cases_features';
import { TestProviders } from '../../common/mock';
import { CasesContextFeatures } from '../../containers/types';

describe('useCasesFeatures', () => {
  // isAlertsEnabled, isSyncAlertsEnabled, alerts
  const tests: Array<[boolean, boolean, CasesContextFeatures['alerts']]> = [
    [true, true, { enabled: true, sync: true }],
    [true, false, { enabled: true, sync: false }],
    [false, false, { enabled: false, sync: true }],
    [false, false, { enabled: false, sync: false }],
    [false, false, { enabled: false }],
    // the default for sync is true
    [true, true, { enabled: true }],
    // the default for enabled is true
    [true, true, { sync: true }],
    // the default for enabled is true
    [true, false, { sync: false }],
    // the default for enabled and sync is true
    [true, true, {}],
  ];

  it.each(tests)(
    'returns isAlertsEnabled=%s and isSyncAlertsEnabled=%s if feature.alerts=%s',
    async (isAlertsEnabled, isSyncAlertsEnabled, alerts) => {
      const { result } = renderHook<{}, UseCasesFeatures>(() => useCasesFeatures(), {
        wrapper: ({ children }) => <TestProviders features={{ alerts }}>{children}</TestProviders>,
      });

      expect(result.current).toEqual({
        isAlertsEnabled,
        isSyncAlertsEnabled,
        metricsFeatures: [],
      });
    }
  );

  it('returns the metrics correctly', async () => {
    const { result } = renderHook<{}, UseCasesFeatures>(() => useCasesFeatures(), {
      wrapper: ({ children }) => (
        <TestProviders features={{ metrics: ['connectors'] }}>{children}</TestProviders>
      ),
    });

    expect(result.current).toEqual({
      isAlertsEnabled: true,
      isSyncAlertsEnabled: true,
      metricsFeatures: ['connectors'],
    });
  });
});
