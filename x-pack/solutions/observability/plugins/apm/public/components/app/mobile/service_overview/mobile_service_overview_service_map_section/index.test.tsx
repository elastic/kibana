/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { ContextualServiceMapSectionProps } from '../../../service_map/contextual_map/contextual_service_map_section';
import { LatencyAggregationType } from '../../../../../../common/latency_aggregation_types';
import { MobileServiceOverviewServiceMapSection } from '.';

const mockUseApmParams = jest.fn();
jest.mock('../../../../../hooks/use_apm_params', () => ({
  useApmParams: () => mockUseApmParams(),
}));

const mockUseApmServiceContext = jest.fn();
jest.mock('../../../../../context/apm_service/use_apm_service_context', () => ({
  useApmServiceContext: () => mockUseApmServiceContext(),
}));

const mockContextualServiceMapSection = jest.fn((_props: ContextualServiceMapSectionProps) => null);
jest.mock('../../../service_map/contextual_map/contextual_service_map_section', () => ({
  ContextualServiceMapSection: (props: ContextualServiceMapSectionProps) =>
    mockContextualServiceMapSection(props),
}));

const baseQuery = {
  environment: 'ENVIRONMENT_ALL',
  kuery: '',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  latencyAggregationType: LatencyAggregationType.p95,
  comparisonEnabled: true,
  offset: '1d',
};

function renderSection(query: Record<string, unknown> = {}) {
  mockUseApmParams.mockReturnValue({ query: { ...baseQuery, ...query } });
  mockUseApmServiceContext.mockReturnValue({
    serviceName: 'opbeans-android',
    transactionType: 'mobile',
  });

  return render(<MobileServiceOverviewServiceMapSection />);
}

describe('MobileServiceOverviewServiceMapSection', () => {
  beforeEach(() => {
    mockContextualServiceMapSection.mockClear();
  });

  it('seeds the service flyout with the page chart filters', () => {
    renderSection();

    expect(mockContextualServiceMapSection).toHaveBeenCalledTimes(1);
    expect(mockContextualServiceMapSection.mock.calls[0][0].flyoutOptions).toEqual({
      transactionType: 'mobile',
      latencyAggregationType: LatencyAggregationType.p95,
    });
  });

  it('combines the mobile filters into the kuery', () => {
    renderSection({ kuery: 'service.version : 1.0', device: 'Pixel7' });

    expect(mockContextualServiceMapSection.mock.calls[0][0].kuery).toBe(
      'service.version : 1.0 and device.model.identifier: Pixel7'
    );
  });

  it('renders nothing without a time range', () => {
    renderSection({ rangeFrom: undefined, rangeTo: undefined });

    expect(mockContextualServiceMapSection).not.toHaveBeenCalled();
  });
});
