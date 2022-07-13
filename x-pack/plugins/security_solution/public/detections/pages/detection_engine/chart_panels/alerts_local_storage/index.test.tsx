/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import React from 'react';

import { useAlertsLocalStorage } from '.';
import { TestProviders } from '../../../../../common/mock';

describe('useAlertsLocalStorage', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders>{children}</TestProviders>
  );

  test('it returns the expected defaults', () => {
    const { result } = renderHook(() => useAlertsLocalStorage(), { wrapper });

    const defaults = Object.fromEntries(
      Object.entries(result.current).filter((x) => typeof x[1] !== 'function')
    );

    expect(defaults).toEqual({
      alertViewSelection: 'trend', // default to the trend chart
      countTableStackBy0: 'kibana.alert.rule.name',
      countTableStackBy1: 'host.name',
      isTreemapPanelExpanded: true,
      riskChartStackBy0: 'kibana.alert.rule.name',
      riskChartStackBy1: 'host.name',
      trendChartStackBy: 'kibana.alert.rule.name',
    });
  });
});
