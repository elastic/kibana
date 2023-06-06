/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLoadingChart } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { niceTimeFormatter, TooltipValue } from '@elastic/charts';
import { sum, min as getMin, max as getMax } from 'lodash';
import { Coordinate } from '../../../../../typings/timeseries';

export const tooltipProps = {
  headerFormatter: (tooltipValue: TooltipValue) =>
    moment(tooltipValue.value).format('Y-MM-DD HH:mm:ss'),
};

export const NUM_BUCKETS = 5;

export const TIME_LABELS = {
  s: i18n.translate('xpack.apm.alerts.timeLabels.seconds', {
    defaultMessage: 'seconds',
  }),
  m: i18n.translate('xpack.apm.alerts.timeLabels.minutes', {
    defaultMessage: 'minutes',
  }),
  h: i18n.translate('xpack.apm.alerts.timeLabels.hours', {
    defaultMessage: 'hours',
  }),
  d: i18n.translate('xpack.apm.alerts.timeLabels.days', {
    defaultMessage: 'days',
  }),
};

export const useDateFormatter = (xMin?: number, xMax?: number) => {
  const dateFormatter = useMemo(() => {
    if (typeof xMin === 'number' && typeof xMax === 'number') {
      return niceTimeFormatter([xMin, xMax]);
    } else {
      return (value: number) => `${value}`;
    }
  }, [xMin, xMax]);
  return dateFormatter;
};

export const formatNumber = (val: number) => {
  return Number(val).toLocaleString('en', {
    maximumFractionDigits: 1,
  });
};

export const yAxisFormatter = formatNumber;

export const getDomain = (
  series: Array<{ name?: string; data: Coordinate[] }>,
  stacked: boolean = false
) => {
  let min: number | null = null;
  let max: number | null = null;
  const valuesByTimestamp = series.reduce<{ [timestamp: number]: number[] }>(
    (acc, serie) => {
      serie.data.forEach((point) => {
        const valuesForTimestamp = acc[point.x] || [];
        acc[point.x] = [...valuesForTimestamp, point.y ?? 0];
      });
      return acc;
    },
    {}
  );
  const pointValues = Object.values(valuesByTimestamp);
  pointValues.forEach((results) => {
    const maxResult = stacked ? sum(results) : getMax(results);
    const minResult = getMin(results);
    if (maxResult && (!max || maxResult > max)) {
      max = maxResult;
    }
    if (minResult && (!min || minResult < min)) {
      min = minResult;
    }
  });
  const timestampValues = Object.keys(valuesByTimestamp).map(Number);
  const minTimestamp = getMin(timestampValues) || 0;
  const maxTimestamp = getMax(timestampValues) || 0;
  return {
    yMin: min || 0,
    yMax: max || 0,
    xMin: minTimestamp,
    xMax: maxTimestamp,
  };
};

export const EmptyContainer: React.FC = ({ children }) => (
  <div
    style={{
      width: '100%',
      height: 150,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    {children}
  </div>
);

export function NoDataState() {
  return (
    <EmptyContainer>
      <EuiText color="subdued" data-test-subj="noChartData">
        <FormattedMessage
          id="xpack.apm.alerts.charts.noDataMessage"
          defaultMessage="No chart data available"
        />
      </EuiText>
    </EmptyContainer>
  );
}

export function LoadingState() {
  return (
    <EmptyContainer>
      <EuiText color="subdued" data-test-subj="loadingData">
        <EuiLoadingChart size="m" />
      </EuiText>
    </EmptyContainer>
  );
}

export function ErrorState() {
  return (
    <EmptyContainer>
      <EuiText color="subdued" data-test-subj="chartErrorState">
        <FormattedMessage
          id="xpack.apm.alerts.charts.errorMessage"
          defaultMessage="Uh oh, something went wrong"
        />
      </EuiText>
    </EmptyContainer>
  );
}

interface PreviewChartLabel {
  lookback: number;
  timeLabel: string;
  displayedGroups: number;
  totalGroups: number;
}

export function TimeLabelForData({
  lookback,
  timeLabel,
  displayedGroups,
  totalGroups,
}: PreviewChartLabel) {
  return (
    <div style={{ textAlign: 'center' }}>
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="xpack.apm.alerts.timeLabelForData"
          defaultMessage="Last {lookback} {timeLabel} of data for 3 groups, showing {displayedGroups}/{totalGroups} groups"
          values={{
            lookback,
            timeLabel,
            displayedGroups,
            totalGroups,
          }}
        />
      </EuiText>
    </div>
  );
}
