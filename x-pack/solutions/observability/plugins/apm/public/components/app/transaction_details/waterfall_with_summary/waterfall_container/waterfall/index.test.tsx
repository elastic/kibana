/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';
import { renderWithContext } from '../../../../../../utils/test_helpers';
import { Waterfall } from '.';
import type { IWaterfall } from './waterfall_helpers/waterfall_helpers';
import { WaterfallLegendType } from '@kbn/apm-ui-shared';

const ROUTE_PATH =
  '/services/{serviceName}/transactions/view?comparisonEnabled=true&environment=ENVIRONMENT_ALL&kuery=&latencyAggregationType=avg&offset=1d&rangeFrom=2026-01-27T18:42:17.513Z&rangeTo=2026-01-27T18:56:56.108Z&serviceGroup=&showCriticalPath=&transactionName=GET%20%2Fapi%2Forders&transactionType=request&flyoutDetailTab=&waterfallItemId=&traceId=b7f4d072c68388e1b8485609c61a546e&transactionId=b7f4d072c68388e1';

describe('Waterfall', () => {
  const createMockWaterfall = (overrides?: Partial<IWaterfall>): IWaterfall => {
    return {
      duration: 1000000,
      items: [],
      childrenByParentId: {},
      getErrorCount: jest.fn(() => 0),
      legends: [],
      colorBy: WaterfallLegendType.ServiceName,
      errorItems: [],
      exceedsMax: false,
      totalErrorsCount: 0,
      traceDocsTotal: 5,
      maxTraceItems: 10,
      orphanTraceItemsCount: 0,
      ...overrides,
    };
  };

  it('does not render warning when exceedsMax is false', () => {
    const waterfall = createMockWaterfall({ exceedsMax: false });
    renderWithContext(
      <Waterfall waterfall={waterfall} showCriticalPath={false} />,
      undefined,
      ROUTE_PATH
    );

    const warning = screen.queryByTestId('apmWaterfallSizeWarning');
    expect(warning).not.toBeInTheDocument();
  });

  it('renders warning when exceedsMax is true', () => {
    const waterfall = createMockWaterfall({
      exceedsMax: true,
      traceDocsTotal: 15551,
      maxTraceItems: 5000,
    });
    renderWithContext(
      <Waterfall waterfall={waterfall} showCriticalPath={false} />,
      undefined,
      ROUTE_PATH
    );

    const warning = screen.getByTestId('apmWaterfallSizeWarning');
    expect(warning).toBeInTheDocument();
  });

  it('displays correct warning text with traceDocsTotal and maxTraceItems', () => {
    const waterfall = createMockWaterfall({
      exceedsMax: true,
      traceDocsTotal: 15551,
      maxTraceItems: 5000,
    });
    renderWithContext(
      <Waterfall waterfall={waterfall} showCriticalPath={false} />,
      undefined,
      ROUTE_PATH
    );

    const warning = screen.getByTestId('apmWaterfallSizeWarning');
    const warningText = warning.textContent;

    expect(warningText).toContain('15551');
    expect(warningText).toContain('5000');
    expect(warningText).toContain('xpack.apm.ui.maxTraceItems');
  });

  it('displays warning with different traceDocsTotal and maxTraceItems values', () => {
    const waterfall = createMockWaterfall({
      exceedsMax: true,
      traceDocsTotal: 10000,
      maxTraceItems: 3000,
    });
    renderWithContext(
      <Waterfall waterfall={waterfall} showCriticalPath={false} />,
      undefined,
      ROUTE_PATH
    );

    const warning = screen.getByTestId('apmWaterfallSizeWarning');
    const warningText = warning.textContent;

    expect(warningText).toContain('10000');
    expect(warningText).toContain('3000');
    expect(warningText).toContain('xpack.apm.ui.maxTraceItems');
  });
});
