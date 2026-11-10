/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { ContextualServiceMapSectionProps } from '../../../service_map/contextual_map/contextual_service_map_section';
import type { TimeRangeMetadataContextProvider } from '../../../../../context/time_range_metadata/time_range_metadata_context';
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

const mockUseTimeRange = jest.fn();
jest.mock('../../../../../hooks/use_time_range', () => ({
  useTimeRange: (range: unknown) => mockUseTimeRange(range),
}));

const mockUiSettings = {};
jest.mock('../../../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({ core: { uiSettings: mockUiSettings } }),
}));

type TimeRangeMetadataProviderProps = React.ComponentProps<typeof TimeRangeMetadataContextProvider>;
const mockTimeRangeMetadataContextProvider = jest.fn(
  ({ children }: TimeRangeMetadataProviderProps) => <>{children}</>
);
jest.mock('../../../../../context/time_range_metadata/time_range_metadata_context', () => ({
  TimeRangeMetadataContextProvider: (props: TimeRangeMetadataProviderProps) =>
    mockTimeRangeMetadataContextProvider(props),
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

const RESOLVED_RANGE = { start: '2026-11-05T10:00:00.000Z', end: '2026-11-05T10:15:00.000Z' };

function renderSection(
  query: Record<string, unknown> = {},
  resolvedRange: { start?: string; end?: string } = RESOLVED_RANGE
) {
  mockUseTimeRange.mockReturnValue(resolvedRange);
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
    mockTimeRangeMetadataContextProvider.mockClear();
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

  it('picks the map source for the map range and the mobile filters', () => {
    renderSection({ kuery: 'service.version : 1.0', device: 'Pixel7' });

    expect(mockUseTimeRange).toHaveBeenCalledWith({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      optional: true,
    });
    expect(mockTimeRangeMetadataContextProvider.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        uiSettings: mockUiSettings,
        ...RESOLVED_RANGE,
        kuery: 'service.version : 1.0 and device.model.identifier: Pixel7',
        useSpanName: false,
      })
    );
    expect(mockContextualServiceMapSection).toHaveBeenCalledTimes(1);
  });

  it('keeps the raw range for the map source when it cannot be resolved', () => {
    renderSection({}, {});

    expect(mockTimeRangeMetadataContextProvider.mock.calls[0][0]).toEqual(
      expect.objectContaining({ start: 'now-15m', end: 'now' })
    );
  });

  it('renders nothing without a time range', () => {
    renderSection({ rangeFrom: undefined, rangeTo: undefined });

    expect(mockContextualServiceMapSection).not.toHaveBeenCalled();
  });
});
