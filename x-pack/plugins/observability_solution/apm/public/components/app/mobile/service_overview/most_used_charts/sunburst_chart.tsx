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
  EuiProgress,
  useEuiFontSize,
} from '@elastic/eui';
import { IconChartDonut } from '@kbn/chart-icons';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
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
  const isLoading = fetchStatus === FETCH_STATUS.LOADING;

  // The loader needs to be wrapped inside a div with fixed height to avoid layout shift
  const ProgressLoader = (
    <div style={{ height: '5px' }}>
      {isLoading && (
        <EuiProgress
          size="xs"
          color="accent"
          style={{ background: 'transparent' }}
        />
      )}
    </div>
  );

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
        <h2
          css={css`
            font-size: ${useEuiFontSize('xs').fontSize};
          `}
        >
          {label}
        </h2>
      </EuiTitle>
      {ProgressLoader}
      <EuiSpacer size="m" />
      <ChartContainer
        hasData={Boolean(isDataAvailable)}
        status={fetchStatus}
        height={200}
        id={`mostUsedChart-${chartKey}`}
      >
        {isDataAvailable ? (
          <Chart>
            <Settings theme={theme} locale={i18n.getLocale()} />
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

const noResultsFoundStyle = css({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
});
export function NoResultsFound() {
  const noResultsFoundText = i18n.translate(
    'xpack.apm.mobile.charts.noResultsFound',
    {
      defaultMessage: 'No results found',
    }
  );
  return (
    <div css={noResultsFoundStyle}>
      <EuiText
        data-test-subj="mostUsedNoResultsFound"
        textAlign="center"
        color="subdued"
        size="xs"
      >
        <EuiIcon type={IconChartDonut} color="subdued" size="l" />
        <EuiSpacer size="s" />
        <p>{noResultsFoundText}</p>
      </EuiText>
    </div>
  );
}
