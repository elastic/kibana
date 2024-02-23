/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  Chart,
  Datum,
  LEGACY_LIGHT_THEME,
  PartialTheme,
  Partition,
  PartitionLayout,
  Settings,
} from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { useTheme } from '@kbn/observability-shared-plugin/public';
import { formatMillisecond } from '../common/network_data/data_formatting';

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
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{TIMINGS_BREAKDOWN}</h3>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiIconTip content={SUM_TIMINGS} position="right" />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <Chart size={{ height: 240 }}>
        <Settings
          theme={[themeOverrides]}
          // TODO connect to charts.theme service see src/plugins/charts/public/services/theme/README.md
          baseTheme={LEGACY_LIGHT_THEME}
          showLegend={false}
          locale={i18n.getLocale()}
        />
        <Partition
          id="spec_1"
          data={networkTimings.timingsWithLabels}
          layout={PartitionLayout.sunburst}
          valueAccessor={(d: Datum) => d?.value}
          valueFormatter={(d: number) => formatMillisecond(d, {})}
          layers={[
            {
              groupByRollup: (d: Datum) => d.label,
              nodeLabel: (d: Datum) => d,
              shape: {
                fillColor: (dataName, index) => {
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
  defaultMessage: 'Timing breakdown',
});

const SUM_TIMINGS = i18n.translate('xpack.synthetics.stepDetailsRoute.timingsBreakdown.info', {
  defaultMessage: 'Sum of all network request timings',
});
