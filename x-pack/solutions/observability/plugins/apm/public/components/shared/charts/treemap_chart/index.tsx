/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { Datum } from '@elastic/charts';
import { Chart, Partition, PartitionLayout, Settings } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { euiPaletteColorBlind } from '@elastic/eui';
import { percentValueGetter } from '@elastic/charts/dist/chart_types/partition_chart/layout/config';
import { isEmpty } from 'lodash';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { ChartContainer } from '../chart_container';

type DataType = Array<{
  label: string;
  count: number;
}>;
export function TreemapChart({
  data,
  height,
  fetchStatus,
  id,
}: {
  data: DataType;
  height: number;
  fetchStatus: FETCH_STATUS;
  id: string;
}) {
  const colorPalette = euiPaletteColorBlind();
  const chartBaseTheme = useElasticChartsTheme();

  return (
    <ChartContainer hasData={!isEmpty(data)} height={height} status={fetchStatus} id={id}>
      <Chart>
        <Settings baseTheme={chartBaseTheme} />
        <Partition
          data={data}
          id="spec_1"
          valueAccessor={(d) => d.count}
          valueGetter={percentValueGetter}
          layout={PartitionLayout.treemap}
          layers={[
            {
              groupByRollup: (d: Datum) => d.label,
              shape: {
                fillColor: (dataName, sortIndex) => colorPalette[Math.floor(sortIndex % 10)],
              },
              fillLabel: {
                valueFormatter: () => '',
                fontWeight: 500,
                minFontSize: 10,
                maxFontSize: 14,
              },
              nodeLabel: (label: Datum) => label,
            },
          ]}
        />
      </Chart>
    </ChartContainer>
  );
}
