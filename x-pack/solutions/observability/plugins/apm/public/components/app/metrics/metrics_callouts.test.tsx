/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import type { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  MockApmPluginContextWrapper,
  mockApmPluginContextValue,
} from '../../../context/apm_plugin/mock_apm_plugin_context';
import { fromQuery } from '../../shared/links/url_helpers';
import {
  MixedAgentCallout,
  NoDataForRangeCallout,
  NoDashboardFoundCallout,
} from './metrics_callouts';
import type { IngestionTimeRanges } from '../../../../common/metrics_types';

function renderWithWrapper(ui: React.ReactElement) {
  const history = createMemoryHistory();
  history.replace({
    pathname: '/services/testServiceName/metrics',
    search: fromQuery({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    }),
  });

  return {
    ...render(
      <MockApmPluginContextWrapper
        history={history}
        value={mockApmPluginContextValue as unknown as ApmPluginContextValue}
      >
        {ui}
      </MockApmPluginContextWrapper>
    ),
    history,
  };
}

describe('NoDataForRangeCallout', () => {
  it('renders the no data callout', () => {
    const { getByTestId } = renderWithWrapper(<NoDataForRangeCallout />);
    expect(getByTestId('apmMetricsNoDataForRange')).toBeInTheDocument();
  });
});

describe('NoDashboardFoundCallout', () => {
  it('renders the no dashboard callout', () => {
    const { getByTestId } = renderWithWrapper(<NoDashboardFoundCallout />);
    expect(getByTestId('apmMetricsNoDashboardFound')).toBeInTheDocument();
  });
});

describe('MixedAgentCallout', () => {
  const sequentialRanges: IngestionTimeRanges = {
    classicApm: { from: 1715000000000, to: 1715100000000 },
    otelNative: { from: 1715100000000, to: 1715200000000 },
  };

  const overlappingRanges: IngestionTimeRanges = {
    classicApm: { from: 1715000000000, to: 1715150000000 },
    otelNative: { from: 1715100000000, to: 1715200000000 },
  };

  it('returns null when ingestionTimeRanges is undefined', () => {
    const { container } = renderWithWrapper(<MixedAgentCallout ingestionTimeRanges={undefined} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders sequential callout for non-overlapping ranges', () => {
    const { getByTestId } = renderWithWrapper(
      <MixedAgentCallout ingestionTimeRanges={sequentialRanges} />
    );
    expect(getByTestId('apmMetricsMixedAgentTypes')).toBeInTheDocument();
  });

  it('renders overlap warning callout for overlapping ranges', () => {
    const { getByTestId } = renderWithWrapper(
      <MixedAgentCallout ingestionTimeRanges={overlappingRanges} />
    );
    expect(getByTestId('apmMetricsMixedAgentTypesOverlap')).toBeInTheDocument();
  });

  it('renders clickable time range links', () => {
    const { getByTestId } = renderWithWrapper(
      <MixedAgentCallout ingestionTimeRanges={sequentialRanges} />
    );
    expect(getByTestId('apmMetricsCurrentTimeRangeLink')).toBeInTheDocument();
    expect(getByTestId('apmMetricsPreviousTimeRangeLink')).toBeInTheDocument();
  });

  it('renders docs link', () => {
    const { getByTestId } = renderWithWrapper(
      <MixedAgentCallout ingestionTimeRanges={sequentialRanges} />
    );
    expect(getByTestId('apmMetricsMixedAgentTypesDocLink')).toBeInTheDocument();
  });

  it('calls onNavigateToIngestionType when a time range link is clicked', () => {
    const onNavigate = jest.fn();
    const { getByTestId } = renderWithWrapper(
      <MixedAgentCallout
        ingestionTimeRanges={sequentialRanges}
        onNavigateToIngestionType={onNavigate}
      />
    );

    fireEvent.click(getByTestId('apmMetricsPreviousTimeRangeLink'));
    expect(onNavigate).toHaveBeenCalledWith('classicApm');
  });

  it('shows the most recent instrumentation as current by default', () => {
    const { getByTestId } = renderWithWrapper(
      <MixedAgentCallout ingestionTimeRanges={sequentialRanges} />
    );

    const currentLink = getByTestId('apmMetricsCurrentTimeRangeLink');
    expect(currentLink).toBeInTheDocument();
  });

  it('swaps current/previous when forcedIngestionType differs from default', () => {
    const onNavigate = jest.fn();
    const { getByTestId } = renderWithWrapper(
      <MixedAgentCallout
        ingestionTimeRanges={sequentialRanges}
        forcedIngestionType="classicApm"
        onNavigateToIngestionType={onNavigate}
      />
    );

    fireEvent.click(getByTestId('apmMetricsPreviousTimeRangeLink'));
    expect(onNavigate).toHaveBeenCalledWith('otelNative');
  });
});
