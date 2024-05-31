/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Chart, Datum, Partition, Position, Settings } from '@elastic/charts';
import { euiPaletteColorBlind, EuiText, useEuiTheme } from '@elastic/eui';
import { asDynamicBytes } from '@kbn/observability-plugin/common';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { StorageDetailsGroupedByIndex } from '../../../../common/storage_explorer';
import { useProfilingChartsTheme } from '../../../hooks/use_profiling_charts_theme';
import { getGroupedIndexLabel } from './utils';

interface Props {
  data?: StorageDetailsGroupedByIndex[];
}

export function GroupedIndexDetailsChart({ data = [] }: Props) {
  const theme = useEuiTheme();
  const { chartsBaseTheme, chartsTheme } = useProfilingChartsTheme();
  const groupedPalette = euiPaletteColorBlind();

  const sunburstData = data.map((item) => {
    const { indexName, ...values } = item;
    return { key: getGroupedIndexLabel(item.indexName), ...values };
  });

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
      {sunburstData.length ? (
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
            locale={i18n.getLocale()}
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
      ) : (
        <div
          style={{ height: 250, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <EuiText color="subdued" size="s">
            {i18n.translate('xpack.profiling.storageExplorer.dataBreakdown.noDataToDisplay', {
              defaultMessage: 'No data to display',
            })}
          </EuiText>
        </div>
      )}
    </div>
  );
}
