/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { ContextualServiceMapSectionProps } from '../../service_map/contextual_map/contextual_service_map_section';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { ServiceOverviewServiceMapSection } from '.';

const mockUseApmParams = jest.fn();
jest.mock('../../../../hooks/use_apm_params', () => ({
  useApmParams: () => mockUseApmParams(),
}));

const mockUseApmServiceContext = jest.fn();
jest.mock('../../../../context/apm_service/use_apm_service_context', () => ({
  useApmServiceContext: () => mockUseApmServiceContext(),
}));

const mockContextualServiceMapSection = jest.fn((_props: ContextualServiceMapSectionProps) => null);
jest.mock('../../service_map/contextual_map/contextual_service_map_section', () => ({
  ContextualServiceMapSection: (props: ContextualServiceMapSectionProps) =>
    mockContextualServiceMapSection(props),
}));

const baseQuery = {
  environment: 'ENVIRONMENT_ALL',
  kuery: '',
  rangeFrom: 'now-30m',
  rangeTo: 'now',
  latencyAggregationType: LatencyAggregationType.avg,
};

function renderSection(query: Record<string, unknown> = {}) {
  mockUseApmParams.mockReturnValue({ query: { ...baseQuery, ...query } });
  mockUseApmServiceContext.mockReturnValue({
    serviceName: 'opbeans-node',
    transactionType: 'request',
  });

  return render(<ServiceOverviewServiceMapSection />);
}

describe('ServiceOverviewServiceMapSection', () => {
  beforeEach(() => {
    mockContextualServiceMapSection.mockClear();
  });

  it('seeds chart filters only, so an open flyout keeps its window on Refresh', () => {
    renderSection();

    expect(mockContextualServiceMapSection).toHaveBeenCalledTimes(1);
    expect(mockContextualServiceMapSection.mock.calls[0][0].flyoutOptions).toEqual({
      transactionType: 'request',
      latencyAggregationType: LatencyAggregationType.avg,
    });
    expect(mockContextualServiceMapSection.mock.calls[0][0].rangeFrom).toBe('now-30m');
    expect(mockContextualServiceMapSection.mock.calls[0][0].rangeTo).toBe('now');
  });

  it('renders nothing without a time range', () => {
    renderSection({ rangeFrom: undefined, rangeTo: undefined });

    expect(mockContextualServiceMapSection).not.toHaveBeenCalled();
  });
});
