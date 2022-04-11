/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { Partition, Settings } from '@elastic/charts';
import { parsedMockAlertsData } from '../../../overview/components/detection_response/alerts_by_status/mock_data';
import { render } from '@testing-library/react';
import { DonutChart, DonutChartProps } from './donutchart';
import { DraggableLegend } from './draggable_legend';
import { ChartLabel } from '../../../overview/components/detection_response/alerts_by_status/chart_label';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
import uuid from 'uuid';

jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');
  return {
    ...actual,
    Chart: jest.fn(({ children, ...props }) => (
      <div data-test-subj="es-chart" {...props}>
        {children}
      </div>
    )),
    Partition: jest.fn((props) => <div data-test-subj="es-chart-partition" {...props} />),
    Settings: jest.fn((props) => <div data-test-subj="es-chart-settings" {...props} />),
  };
});

jest.mock('uuid', () => {
  const actual = jest.requireActual('uuid');

  return {
    ...actual,
    v4: jest.fn().mockReturnValue('test-uuid'),
  };
});

jest.mock('../../../overview/components/detection_response/alerts_by_status/chart_label', () => {
  return {
    ChartLabel: jest.fn((props) => <span data-test-subj="chart-label" {...props} />),
  };
});

jest.mock('./draggable_legend', () => {
  return {
    DraggableLegend: jest.fn((props) => <span data-test-subj="draggable-legend" {...props} />),
  };
});

jest.mock('./common', () => {
  return {
    useTheme: jest.fn(() => ({
      eui: {
        euiScrollBar: 0,
        euiColorDarkShade: '#fff',
        euiScrollBarCorner: '#ccc',
      },
    })),
  };
});

const testColors = {
  critical: '#EF6550',
  high: '#EE9266',
  medium: '#F3B689',
  low: '#F8D9B2',
};

describe('DonutChart', () => {
  const props: DonutChartProps = {
    data: parsedMockAlertsData?.open?.severities,
    label: 'Open',
    link: null,
    title: <ChartLabel count={parsedMockAlertsData?.open?.total} />,
    fillColor: jest.fn(() => '#ccc'),
    totalCount: parsedMockAlertsData?.open?.total,
    legendItems: (['critical', 'high', 'medium', 'low'] as Severity[]).map((d) => ({
      color: testColors[d],
      dataProviderId: escapeDataProviderId(`draggable-legend-item-${uuid.v4()}-${d}`),
      timelineId: undefined,
      field: 'kibana.alert.severity',
      value: d,
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('should render Chart', () => {
    const { container } = render(<DonutChart {...props} />);
    expect(container.querySelector(`[data-test-subj="es-chart"]`)).toBeInTheDocument();
  });

  test('should render chart Settings', () => {
    const { container } = render(<DonutChart {...props} />);
    expect(container.querySelector(`[data-test-subj="es-chart-settings"]`)).toBeInTheDocument();

    expect((Settings as jest.Mock).mock.calls[0][0]).toEqual({
      baseTheme: {
        eui: {
          euiColorDarkShade: '#fff',
          euiScrollBar: 0,
          euiScrollBarCorner: '#ccc',
        },
      },
      theme: {
        chartMargins: { bottom: 0, left: 0, right: 0, top: 0 },
        partition: {
          circlePadding: 4,
          emptySizeRatio: 0.4,
          idealFontSizeJump: 1.1,
          linkLabel: { maximumSection: Infinity },
          outerSizeRatio: 0.9,
        },
      },
    });
  });

  test('should render an empty chart', () => {
    const testProps = {
      ...props,
      data: parsedMockAlertsData?.acknowledged?.severities,
      label: 'Acknowledged',
      title: <ChartLabel count={parsedMockAlertsData?.acknowledged?.total} />,
      totalCount: parsedMockAlertsData?.acknowledged?.total,
    };
    const { container } = render(<DonutChart {...testProps} />);
    expect(container.querySelector(`[data-test-subj="empty-donut"]`)).toBeInTheDocument();
  });

  test('should render chart Partition', () => {
    const { container } = render(<DonutChart {...props} />);
    expect(container.querySelector(`[data-test-subj="es-chart-partition"]`)).toBeInTheDocument();
    expect((Partition as jest.Mock).mock.calls[0][0].data).toEqual(
      parsedMockAlertsData?.open?.severities
    );
    expect((Partition as jest.Mock).mock.calls[0][0].layout).toEqual('sunburst');
    expect((Partition as jest.Mock).mock.calls[0][0].layers.length).toEqual(3);
  });

  test('should render chart legend', () => {
    const { container } = render(<DonutChart {...props} />);
    expect(container.querySelector(`[data-test-subj="draggable-legend"]`)).toBeInTheDocument();
    expect((DraggableLegend as unknown as jest.Mock).mock.calls[0][0].legendItems).toEqual([
      {
        color: '#EF6550',
        dataProviderId: 'draggable-legend-item-test-uuid-critical',
        field: 'kibana.alert.severity',
        timelineId: undefined,
        value: 'critical',
      },
      {
        color: '#EE9266',
        dataProviderId: 'draggable-legend-item-test-uuid-high',
        field: 'kibana.alert.severity',
        timelineId: undefined,
        value: 'high',
      },
      {
        color: '#F3B689',
        dataProviderId: 'draggable-legend-item-test-uuid-medium',
        field: 'kibana.alert.severity',
        timelineId: undefined,
        value: 'medium',
      },
      {
        color: '#F8D9B2',
        dataProviderId: 'draggable-legend-item-test-uuid-low',
        field: 'kibana.alert.severity',
        timelineId: undefined,
        value: 'low',
      },
    ]);
  });

  test('should NOT render chart legend if showLegend is false', () => {
    const testProps = {
      ...props,
      legendItems: null,
    };
    const { container } = render(<DonutChart {...testProps} />);
    expect(container.querySelector(`[data-test-subj="legend"]`)).not.toBeInTheDocument();
  });
});
