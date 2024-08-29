/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, CSSProperties } from 'react';
import { Chart, Metric, Settings, type MetricWNumber, type MetricWTrend } from '@elastic/charts';
import { EuiPanel, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  ChartLoadingProgress,
  ChartPlaceholder,
} from '../../../../../components/lens/chart_placeholder';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';

export interface Props extends Pick<MetricWTrend, 'title' | 'color' | 'extra' | 'subtitle'> {
  id: string;
  loading: boolean;
  value: number;
  toolTip: React.ReactNode;
  style?: CSSProperties;
}

export const MetricChartWrapper = React.memo(
  ({ color, extra, id, loading, value, subtitle, title, toolTip, style, ...props }: Props) => {
    const { euiTheme } = useEuiTheme();
    const loadedOnce = useRef(false);

    const {
      services: { charts },
    } = useKibanaContextForPlugin();

    const baseTheme = charts.theme.useChartsBaseTheme();

    useEffect(() => {
      if (!loadedOnce.current && !loading) {
        loadedOnce.current = true;
      }
    }, [loading]);

    const metricsData: MetricWNumber = {
      title,
      subtitle,
      color,
      extra,
      value,
      valueFormatter: (d: number) => d.toString(),
    };

    return (
      <EuiPanel
        {...props}
        hasShadow={false}
        paddingSize="none"
        data-test-subj={id}
        css={css`
          display: flex;
          position: relative;
        `}
      >
        {loading && !loadedOnce.current ? (
          <ChartPlaceholder style={style} />
        ) : (
          <EuiToolTip
            className="eui-fullWidth"
            delay="regular"
            content={toolTip}
            anchorClassName="eui-fullWidth"
          >
            <Chart
              size={style}
              css={css`
                .echMetric {
                  border-radius: ${euiTheme.border.radius.medium};
                  pointer-events: none;
                }
              `}
            >
              {loading && <ChartLoadingProgress hasTopMargin={false} />}
              <Settings baseTheme={baseTheme} />
              <Metric id={id} data={[[metricsData]]} />
            </Chart>
          </EuiToolTip>
        )}
      </EuiPanel>
    );
  }
);
