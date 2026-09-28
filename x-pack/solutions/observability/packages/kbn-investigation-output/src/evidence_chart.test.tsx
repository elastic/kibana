/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import moment from 'moment-timezone';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { EvidenceChart as EvidenceChartSpec } from '@kbn/significant-events-schema';
import { EvidenceChart } from './evidence_chart';

const mockSeriesProps = jest.fn();

jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');
  const MockSeries = (props: Record<string, unknown>) => {
    mockSeriesProps(props);
    return null;
  };
  return {
    ...actual,
    Chart: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Settings: () => null,
    Axis: () => null,
    LineSeries: MockSeries,
    BarSeries: MockSeries,
  };
});

const chart: EvidenceChartSpec = {
  type: 'line',
  title: 'Error rate',
  x_axis: { type: 'time' },
  y_axis: {},
  series: [
    {
      name: 'errors',
      points: [
        { x: '2026-07-28T14:00:00Z', y: 1 },
        { x: '2026-07-28T14:05:00Z', y: 5 },
      ],
    },
  ],
};

const uiSettingsWithTimeZone = (timeZone: string): IUiSettingsClient =>
  ({
    get: jest.fn((key: string) => (key === 'dateFormat:tz' ? timeZone : undefined)),
  } as unknown as IUiSettingsClient);

describe('EvidenceChart', () => {
  beforeEach(() => {
    mockSeriesProps.mockClear();
  });

  it('renders series in the time zone configured by dateFormat:tz', () => {
    render(
      <KibanaContextProvider services={{ uiSettings: uiSettingsWithTimeZone('Asia/Tokyo') }}>
        <EvidenceChart chart={chart} />
      </KibanaContextProvider>
    );

    expect(mockSeriesProps).toHaveBeenCalledWith(
      expect.objectContaining({ timeZone: 'Asia/Tokyo' })
    );
  });

  it('uses the browser time zone when dateFormat:tz is set to Browser', () => {
    render(
      <KibanaContextProvider services={{ uiSettings: uiSettingsWithTimeZone('Browser') }}>
        <EvidenceChart chart={chart} />
      </KibanaContextProvider>
    );

    expect(mockSeriesProps).toHaveBeenCalledWith(
      expect.objectContaining({ timeZone: moment.tz.guess(true) })
    );
  });

  it('falls back to the browser time zone without uiSettings', () => {
    render(<EvidenceChart chart={chart} />);

    expect(mockSeriesProps).toHaveBeenCalledWith(
      expect.objectContaining({ timeZone: moment.tz.guess(true) })
    );
  });
});
