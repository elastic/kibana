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

import { i18n } from '@kbn/i18n';
import { EuiLoadingSpinner, EuiSpacer, EuiTitle } from '@elastic/eui';
import { useNetworkTimings } from '../hooks/use_network_timings';
import { TotalStepDuration } from './step_total_duration';

const themeOverrides: PartialTheme = {
  chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
  partition: {
    linkLabel: {
      maximumSection: Infinity,
    },
    idealFontSizeJump: 1.1,
    outerSizeRatio: 0.9,
    emptySizeRatio: 0.4,
    circlePadding: 4,
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
        <h3>Timings breakdown</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <Chart size={{ height: 180 }}>
        <Settings theme={[themeOverrides, LIGHT_THEME ?? {}]} showLegend={true} showLegendExtra />
        <Partition
          id="spec_1"
          data={[
            {
              value: networkTimings.timings.dns,
              label: SYNTHETICS_DNS_TIMINGS,
            },
            {
              value: networkTimings.timings.ssl,
              label: SYNTHETICS_SSL_TIMINGS,
            },
            {
              value: networkTimings.timings.blocked,
              label: SYNTHETICS_BLOCKED_TIMINGS,
            },
            {
              value: networkTimings.timings.connect,
              label: SYNTHETICS_CONNECT_TIMINGS,
            },
            {
              value: networkTimings.timings.receive,
              label: SYNTHETICS_RECEIVE_TIMINGS,
            },
            {
              value: networkTimings.timings.send,
              label: SYNTHETICS_SEND_TIMINGS,
            },
            {
              value: networkTimings.timings.wait,
              label: SYNTHETICS_WAIT_TIMINGS,
            },
            {
              value: networkTimings.timings.total,
              label: SYNTHETICS_TOTAL_TIMINGS,
            },
          ]}
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
      <TotalStepDuration />
    </>
  );
};

export const formatMillisecond = (ms: number) => {
  if (ms < 1000) {
    return `${ms.toFixed(0)} ms`;
  }
  return `${(ms / 1000).toFixed(1)} s`;
};

const SYNTHETICS_CONNECT_TIMINGS = i18n.translate('xpack.synthetics.connect.label', {
  defaultMessage: 'Connect',
});
const SYNTHETICS_DNS_TIMINGS = i18n.translate('xpack.synthetics.dns', {
  defaultMessage: 'DNS',
});
const SYNTHETICS_WAIT_TIMINGS = i18n.translate('xpack.synthetics.wait', {
  defaultMessage: 'Wait',
});

const SYNTHETICS_SSL_TIMINGS = i18n.translate('xpack.synthetics.ssl', {
  defaultMessage: 'SSL',
});
const SYNTHETICS_BLOCKED_TIMINGS = i18n.translate('xpack.synthetics.blocked', {
  defaultMessage: 'Blocked',
});
const SYNTHETICS_SEND_TIMINGS = i18n.translate('xpack.synthetics.send', {
  defaultMessage: 'Send',
});
const SYNTHETICS_RECEIVE_TIMINGS = i18n.translate('xpack.synthetics.receive', {
  defaultMessage: 'Receive',
});
const SYNTHETICS_TOTAL_TIMINGS = i18n.translate('xpack.synthetics.total', {
  defaultMessage: 'Total',
});
