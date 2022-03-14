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

describe('useCasesFeatures', () => {
  it('returns isAlertsEnabled=true and isSyncAlertsEnabled=true if the feature.alerts={sync: true, enabled: true}', async () => {
    const { result } = renderHook<{}, UseCasesFeatures>(() => useCasesFeatures(), {
      wrapper: ({ children }) => (
        <TestProviders features={{ alerts: { sync: true, enabled: true } }}>
          {children}
        </TestProviders>
      ),
    });

    expect(result.current).toEqual({
      isAlertsEnabled: true,
      isSyncAlertsEnabled: true,
      metricsFeatures: [],
    });
  });

  it('returns isAlertsEnabled=true and isSyncAlertsEnabled=false if the feature.alerts={sync: false, enabled: true}', async () => {
    const { result } = renderHook<{}, UseCasesFeatures>(() => useCasesFeatures(), {
      wrapper: ({ children }) => (
        <TestProviders features={{ alerts: { sync: false, enabled: true } }}>
          {children}
        </TestProviders>
      ),
    });

    expect(result.current).toEqual({
      isAlertsEnabled: true,
      isSyncAlertsEnabled: false,
      metricsFeatures: [],
    });
  });

  it('returns isAlertsEnabled=false and isSyncAlertsEnabled=false if the feature.alerts={ enabled: false }', async () => {
    const { result } = renderHook<{}, UseCasesFeatures>(() => useCasesFeatures(), {
      wrapper: ({ children }) => (
        <TestProviders features={{ alerts: { enabled: false } }}>{children}</TestProviders>
      ),
    });

    expect(result.current).toEqual({
      isAlertsEnabled: false,
      isSyncAlertsEnabled: false,
      metricsFeatures: [],
    });
  });

  it('returns isAlertsEnabled=true and isSyncAlertsEnabled=true if the feature.alerts={ enabled: true }', async () => {
    const { result } = renderHook<{}, UseCasesFeatures>(() => useCasesFeatures(), {
      wrapper: ({ children }) => (
        <TestProviders features={{ alerts: { enabled: true } }}>{children}</TestProviders>
      ),
    });

    expect(result.current).toEqual({
      isAlertsEnabled: true,
      isSyncAlertsEnabled: true,
      metricsFeatures: [],
    });
  });

  it('returns isAlertsEnabled=false and isSyncAlertsEnabled=false if the feature.alerts={ sync: true enabled: false }', async () => {
    const { result } = renderHook<{}, UseCasesFeatures>(() => useCasesFeatures(), {
      wrapper: ({ children }) => (
        <TestProviders features={{ alerts: { sync: true, enabled: false } }}>
          {children}
        </TestProviders>
      ),
    });

    expect(result.current).toEqual({
      isAlertsEnabled: false,
      isSyncAlertsEnabled: false,
      metricsFeatures: [],
    });
  });

  it('returns isAlertsEnabled=false and isSyncAlertsEnabled=false if the feature.alerts={ sync: false enabled: false }', async () => {
    const { result } = renderHook<{}, UseCasesFeatures>(() => useCasesFeatures(), {
      wrapper: ({ children }) => (
        <TestProviders features={{ alerts: { sync: false, enabled: false } }}>
          {children}
        </TestProviders>
      ),
    });

    expect(result.current).toEqual({
      isAlertsEnabled: false,
      isSyncAlertsEnabled: false,
      metricsFeatures: [],
    });
  });

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
