/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import moment from 'moment-timezone';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { EvidenceChart as EvidenceChartSpec } from '@kbn/agentic-investigations-plugin/common';
import { EvidenceChart } from './evidence_chart';

const mockSeriesProps = jest.fn();
const mockLineAnnotationProps = jest.fn();

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
    LineAnnotation: (props: Record<string, unknown>) => {
      mockLineAnnotationProps(props);
      return null;
    },
    RectAnnotation: () => null,
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

const uiSettingsWithTimeZone = (timeZone: string, dateFormat?: string): IUiSettingsClient =>
  ({
    get: jest.fn((key: string) => {
      if (key === 'dateFormat:tz') {
        return timeZone;
      }
      return key === 'dateFormat' ? dateFormat : undefined;
    }),
  } as unknown as IUiSettingsClient);

describe('EvidenceChart', () => {
  beforeEach(() => {
    mockSeriesProps.mockClear();
    mockLineAnnotationProps.mockClear();
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

  it('lists point and range annotation labels below the chart', () => {
    render(
      <EvidenceChart
        chart={{
          ...chart,
          annotations: [
            { x: '2026-07-28T14:01:00Z', label: 'Deploy v2.3.1' },
            { x: '2026-07-28T14:02:00Z', x_end: '2026-07-28T14:04:00Z', label: 'Pool exhausted' },
          ],
        }}
      />
    );

    const annotations = screen.getAllByTestId('investigationEvidenceChartAnnotation');
    expect(annotations.map((annotation) => annotation.textContent)).toEqual([
      'Deploy v2.3.1',
      'Pool exhausted',
    ]);
  });

  it('renders no annotation list without annotations', () => {
    render(<EvidenceChart chart={chart} />);

    expect(screen.queryByTestId('investigationEvidenceChartAnnotation')).not.toBeInTheDocument();
  });

  it('titles point annotation tooltips with the timestamp formatted in the Kibana settings', () => {
    render(
      <KibanaContextProvider
        services={{ uiSettings: uiSettingsWithTimeZone('Asia/Tokyo', 'YYYY-MM-DD HH:mm') }}
      >
        <EvidenceChart
          chart={{ ...chart, annotations: [{ x: '2026-07-28T14:01:00Z', label: 'Deploy v2.3.1' }] }}
        />
      </KibanaContextProvider>
    );

    expect(mockLineAnnotationProps).toHaveBeenCalledWith(
      expect.objectContaining({
        dataValues: [
          {
            dataValue: Date.parse('2026-07-28T14:01:00Z'),
            details: 'Deploy v2.3.1',
            header: '2026-07-28 23:01',
          },
        ],
      })
    );
  });

  it('titles point annotation tooltips on a category axis with the category', () => {
    render(
      <EvidenceChart
        chart={{
          ...chart,
          x_axis: { type: 'category' },
          series: [{ name: 'errors', points: [{ x: 'checkout', y: 3 }] }],
          annotations: [{ x: 'checkout', label: 'Worst service' }],
        }}
      />
    );

    expect(mockLineAnnotationProps).toHaveBeenCalledWith(
      expect.objectContaining({
        dataValues: [{ dataValue: 'checkout', details: 'Worst service', header: 'checkout' }],
      })
    );
  });
});
