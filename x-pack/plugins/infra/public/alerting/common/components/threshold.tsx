/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Chart, Metric, Settings } from '@elastic/charts';
import { EuiIcon, EuiPanel, useEuiBackgroundColor } from '@elastic/eui';
import type { PartialTheme, Theme } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { Comparator } from '../../../../common/alerting/metrics';

export interface ChartProps {
  theme: PartialTheme;
  baseTheme: Theme;
}

export interface Props {
  chartProps: ChartProps;
  comparator: Comparator | string;
  id: string;
  threshold: number;
  title: string;
  value: number;
  valueFormatter: (d: number) => string;
}

export const Threshold = ({
  chartProps: { theme, baseTheme },
  comparator,
  id,
  threshold,
  title,
  value,
  valueFormatter,
}: Props) => {
  const color = useEuiBackgroundColor('danger');

  return (
    <EuiPanel
      paddingSize="none"
      style={{
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        minWidth: '100%',
      }}
      hasShadow={false}
      data-test-subj={`threshold-${threshold}-${value}`}
    >
      <Chart>
        <Settings theme={theme} baseTheme={baseTheme} locale={i18n.getLocale()} />
        <Metric
          id={id}
          data={[
            [
              {
                title,
                extra: (
                  <span>
                    {i18n.translate('xpack.infra.alerting.thresholdExtraTitle', {
                      values: { comparator, threshold: valueFormatter(threshold) },
                      defaultMessage: `Alert when {comparator} {threshold}`,
                    })}
                  </span>
                ),
                color,
                value,
                valueFormatter,
                icon: ({ width, height, color: iconColor }) => (
                  <EuiIcon width={width} height={height} color={iconColor} type="alert" />
                ),
              },
            ],
          ]}
        />
      </Chart>
    </EuiPanel>
  );
};
