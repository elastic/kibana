/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Chart,
  Partition,
  Settings,
  PartitionLayout,
  Datum,
  LIGHT_THEME,
  PartialTheme,
} from '@elastic/charts';
import React from 'react';
import { useTheme } from '@kbn/observability-plugin/public';

import { EuiLoadingSpinner, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useNetworkTimings } from '../hooks/use_network_timings';

const themeOverrides: PartialTheme = {
  chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
  partition: {
    linkLabel: {
      maximumSection: Infinity,
      maxCount: 0,
    },
    idealFontSizeJump: 1.1,
    outerSizeRatio: 0.9,
    emptySizeRatio: 0.6,
    circlePadding: 5,
  },
};

export const NetworkTimingsDonut = () => {
  const networkTimings = useNetworkTimings();

  const theme = useTheme();

  if (!networkTimings) {
    return <EuiLoadingSpinner size="xl" />;
  }

  return (
    <>
      <EuiTitle size="xs">
        <h3>{TIMINGS_BREAKDOWN}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <Chart size={{ height: 180 }}>
        <Settings theme={[themeOverrides, LIGHT_THEME ?? {}]} showLegend={false} />
        <Partition
          id="spec_1"
          data={networkTimings.timingsWithLabels}
          layout={PartitionLayout.sunburst}
          valueAccessor={(d: Datum) => d?.value}
          valueFormatter={(d: number) => formatMillisecond(d)}
          layers={[
            {
              groupByRollup: (d: Datum) => d.label,
              nodeLabel: (d: Datum) => d,
              shape: {
                fillColor: (d: Datum, index: number) => {
                  return (theme.eui as unknown as Record<string, string>)[
                    `euiColorVis${index + 1}`
                  ];
                },
              },
            },
          ]}
        />
      </Chart>
    </>
  );
};

const TIMINGS_BREAKDOWN = i18n.translate('xpack.synthetics.stepDetailsRoute.timingsBreakdown', {
  defaultMessage: 'Timings breakdown',
});

export const formatMillisecond = (ms: number) => {
  if (ms < 1000) {
    return `${ms.toFixed(0)} ms`;
  }
  return `${(ms / 1000).toFixed(1)} s`;
};
