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
import { euiPaletteColorBlind, EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import { IconChartTreemap } from '@kbn/chart-icons';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
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
  const hasData = !isEmpty(data);

  return (
    <ChartContainer hasData={hasData} height={height} status={fetchStatus} id={id}>
      {hasData ? (
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
      ) : (
        <NoResultsFound />
      )}
    </ChartContainer>
  );
}

const noResultsFoundStyle = css({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
});

function NoResultsFound() {
  const noResultsFoundText = i18n.translate('xpack.apm.treemapChart.noResultsFound', {
    defaultMessage: 'No results found',
  });
  return (
    <div css={noResultsFoundStyle}>
      <EuiText data-test-subj="treemapNoResultsFound" textAlign="center" color="subdued" size="xs">
        <EuiIcon type={IconChartTreemap} color="subdued" size="l" aria-hidden={true} />
        <EuiSpacer size="s" />
        <p>{noResultsFoundText}</p>
      </EuiText>
    </div>
  );
}
