/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, CSSProperties } from 'react';
import { Chart, Metric, type MetricWNumber, type MetricWTrend } from '@elastic/charts';
import { EuiPanel, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ChartPlaceholder } from '../../../../../components/lens';

export interface Props extends Pick<MetricWTrend, 'title' | 'color' | 'extra' | 'subtitle'> {
  id: string;
  loading: boolean;
  value: number;
  toolTip: React.ReactNode;
  style?: CSSProperties;
<<<<<<< HEAD
=======
  ['data-test-subj']?: string;
>>>>>>> whats-new
}

export const MetricChartWrapper = React.memo(
  ({ color, extra, id, loading, value, subtitle, title, toolTip, style, ...props }: Props) => {
<<<<<<< HEAD
    const euiTheme = useEuiTheme();
=======
>>>>>>> whats-new
    const loadedOnce = useRef(false);

    useEffect(() => {
      if (!loadedOnce.current && !loading) {
        loadedOnce.current = true;
      }
      return () => {
        loadedOnce.current = false;
      };
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
<<<<<<< HEAD
      <EuiPanel {...props} hasShadow={false} paddingSize="none" data-test-subj={id}>
        {loading && !loadedOnce.current ? (
          <ChartPlaceholder style={style} />
        ) : (
=======
      <EuiPanel hasShadow={false} paddingSize="none" {...props}>
        <ChartLoader loading={loading} loadedOnce={loadedOnce.current} style={style}>
>>>>>>> whats-new
          <EuiToolTip
            className="eui-fullWidth"
            delay="regular"
            content={toolTip}
            anchorClassName="eui-fullWidth"
          >
<<<<<<< HEAD
            <Chart
              size={style}
              css={css`
                .echMetric {
                  border-radius: ${euiTheme.euiTheme.border.radius.medium};
                  pointer-events: none;
                }
              `}
            >
              <Metric id={id} data={[[metricsData]]} />
            </Chart>
          </EuiToolTip>
        )}
      </EuiPanel>
    );
=======
            <KPIChartStyled size={style}>
              <Metric id={id} data={[[metricsData]]} />
            </KPIChartStyled>
          </EuiToolTip>
        </ChartLoader>
      </EuiPanel>
    );
  }
);

const KPIChartStyled = styled(Chart)`
  .echMetric {
    border-radius: ${(p) => p.theme.eui.euiBorderRadius};
    pointer-events: none;
>>>>>>> whats-new
  }
);
