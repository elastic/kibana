/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Chart, Metric, type MetricWNumber, type MetricWTrend } from '@elastic/charts';
import styled from 'styled-components';
import { EuiPanel, EuiToolTip } from '@elastic/eui';
import { ChartLoader } from './chart_loader';

export interface Props extends Pick<MetricWTrend, 'title' | 'color' | 'extra' | 'subtitle'> {
  id: string;
  loading: boolean;
  value: number;
  toolTip: string;
  ['data-test-subj']?: string;
}

const MIN_HEIGHT = 150;

export const MetricChartWrapper = ({
  color,
  extra,
  id,
  loading,
  value,
  subtitle,
  title,
  toolTip,
  ...props
}: Props) => {
  const metricsData: MetricWNumber = {
    title,
    subtitle,
    color,
    extra,
    value,
    valueFormatter: (d: number) => d.toString(),
  };

  return (
    <EuiPanel hasShadow={false} paddingSize="none" {...props}>
      <ChartLoader loading={loading}>
        <EuiToolTip
          className="eui-fullWidth"
          delay="regular"
          content={toolTip}
          anchorClassName="eui-fullWidth"
        >
          <KPIChartStyled size={{ height: MIN_HEIGHT }}>
            <Metric id={id} data={[[metricsData]]} />
          </KPIChartStyled>
        </EuiToolTip>
      </ChartLoader>
    </EuiPanel>
  );
};

const KPIChartStyled = styled(Chart)`
  .echMetric {
    border-radius: ${(p) => p.theme.eui.euiBorderRadius};
    pointer-events: none;
  }
`;
