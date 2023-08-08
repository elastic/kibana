/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Chart, Datum, Partition, Position, Settings } from '@elastic/charts';
import { euiPaletteColorBlind, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { asDynamicBytes } from '@kbn/observability-plugin/common';
import React from 'react';
import type {
  StorageExplorerIndexNames,
  StorageExplorerIndexDataBreakdownStatsStats,
  StotageExplorerIndicesDataBreakdownChart,
} from '../../../common/storage_explorer';
import { useProfilingChartsTheme } from '../../hooks/use_profiling_charts_theme';

export function getIndexLabel(label: StorageExplorerIndexNames) {
  switch (label) {
    case 'events':
      return i18n.translate('xpack.profiling.storageExplorer.dataBreakdown.chart.events', {
        defaultMessage: 'Events',
      });
    case 'executables':
      return i18n.translate('xpack.profiling.storageExplorer.dataBreakdown.chart.executables', {
        defaultMessage: 'Executables',
      });
    case 'metrics':
      return i18n.translate('xpack.profiling.storageExplorer.dataBreakdown.chart.metrics', {
        defaultMessage: 'Metrics',
      });
    case 'stackframes':
      return i18n.translate('xpack.profiling.storageExplorer.dataBreakdown.chart.stackframes', {
        defaultMessage: 'Stackframes',
      });
    case 'stacktraces':
      return i18n.translate('xpack.profiling.storageExplorer.dataBreakdown.chart.stacktraces', {
        defaultMessage: 'Stacktraces',
      });
  }
}

interface Props {
  data?: StotageExplorerIndicesDataBreakdownChart;
}

export function DataBreakdownChart({ data }: Props) {
  const theme = useEuiTheme();
  const { chartsBaseTheme, chartsTheme } = useProfilingChartsTheme();
  const groupedPalette = euiPaletteColorBlind();

  const sunburstData = data
    ? Object.keys(data).map((key) => {
        const indexName = key as StorageExplorerIndexNames;
        const value = data[indexName] as StorageExplorerIndexDataBreakdownStatsStats;
        return { key: getIndexLabel(indexName), ...value };
      })
    : [];

  return (
    <div
      style={{
        backgroundColor: theme.euiTheme.colors.lightestShade,
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Chart size={{ height: 250, width: 400 }}>
        <Settings
          showLegend
          legendPosition={Position.Right}
          baseTheme={chartsBaseTheme}
          theme={{
            ...chartsTheme,
            background: {
              color: 'transparent',
            },
          }}
        />
        <Partition
          layout="sunburst"
          id="spec_1"
          data={sunburstData}
          valueAccessor={(d: Datum) => Number(d.sizeInBytes)}
          valueGetter="percent"
          valueFormatter={(value: number) => asDynamicBytes(value)}
          layers={[
            {
              groupByRollup: (d: Datum) => d.key,
              shape: {
                fillColor: (_, sortIndex) => groupedPalette[sortIndex],
              },
            },
          ]}
        />
      </Chart>
    </div>
  );
}
