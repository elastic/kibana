/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import {
  Chart,
  Partition,
  PartitionLayout,
  Datum,
  PartialTheme,
  Settings,
} from '@elastic/charts';

import {
  EuiFlexItem,
  euiPaletteColorBlindBehindText,
  EuiTitle,
  EuiIcon,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { IconChartDonut } from '@kbn/chart-icons';
import { ChartContainer } from '../../../../shared/charts/chart_container';
import { FETCH_STATUS } from '../../../../../hooks/use_fetcher';

const theme: PartialTheme = {
  chartMargins: { top: 0, left: 0, bottom: 0, right: 0 },
  partition: {
    minFontSize: 5,
    idealFontSizeJump: 1.1,
    outerSizeRatio: 1,
    emptySizeRatio: 0.3,
    circlePadding: 3,
  },
};

export function SunburstChart({
  data,
  label,
  chartKey,
  fetchStatus,
  chartWidth,
}: {
  data?: Array<{ key: string | number; docCount: number }>;
  label?: string;
  chartKey: string;
  fetchStatus: FETCH_STATUS;
  chartWidth: number;
}) {
  const colors = euiPaletteColorBlindBehindText({ sortBy: 'natural' });
  const isDataAvailable = data && data.length > 0;
  return (
    <EuiFlexItem
      grow={true}
      key={chartKey}
      style={{
        height: '200px',
        width: chartWidth,
      }}
    >
      <EuiTitle size="xs">
        <h2 style={{ fontSize: '0.8571rem' }}>{label}</h2>
      </EuiTitle>
      <ChartContainer
        hasData={Boolean(isDataAvailable)}
        status={fetchStatus}
        height={200}
        id={`mostUsedChart-${chartKey}`}
      >
        {isDataAvailable ? (
          <Chart>
            <Settings theme={theme} />
            <Partition
              id={chartKey}
              data={data}
              layout={PartitionLayout.sunburst}
              valueAccessor={(d: Datum) => Number(d.docCount)}
              valueGetter="percent"
              layers={[
                {
                  groupByRollup: (d: Datum) => d.key,
                  nodeLabel: (d: Datum) => d,
                  fillLabel: {
                    fontWeight: 100,
                    maximizeFontSize: true,
                    valueFont: {
                      fontWeight: 900,
                    },
                  },
                  shape: {
                    fillColor: (_, sortIndex) => {
                      return colors[sortIndex];
                    },
                  },
                },
              ]}
            />
          </Chart>
        ) : (
          <NoResultsFound />
        )}
      </ChartContainer>
    </EuiFlexItem>
  );
}

export function NoResultsFound() {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <EuiText
        data-test-subj="mostUsedNoResultsFound"
        textAlign="center"
        color="subdued"
        size="xs"
      >
        <EuiIcon type={IconChartDonut} color="subdued" size="l" />
        <EuiSpacer size="s" />
        <p>
          <FormattedMessage
            id="xpack.apm.mobile.charts.noResultsFound"
            defaultMessage="No results found"
          />
        </p>
      </EuiText>
    </div>
  );
}
