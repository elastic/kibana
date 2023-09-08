/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { niceTimeFormatter } from '@elastic/charts';
import { Theme, LIGHT_THEME, DARK_THEME } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { EuiLoadingChart, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { sum, min as getMin, max as getMax } from 'lodash';
import { GetLogAlertsChartPreviewDataSuccessResponsePayload } from '../../../../../common/threshold_rule/types';
import { formatNumber } from '../../../../../common/threshold_rule/formatters/number';

type Series = GetLogAlertsChartPreviewDataSuccessResponsePayload['data']['series'];

export const NUM_BUCKETS = 20;

export const TIME_LABELS = {
  s: i18n.translate('xpack.observability.threshold.rule..timeLabels.seconds', {
    defaultMessage: 'seconds',
  }),
  m: i18n.translate('xpack.observability.threshold.rule..timeLabels.minutes', {
    defaultMessage: 'minutes',
  }),
  h: i18n.translate('xpack.observability.threshold.rule..timeLabels.hours', {
    defaultMessage: 'hours',
  }),
  d: i18n.translate('xpack.observability.threshold.rule..timeLabels.days', {
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

export const yAxisFormatter = formatNumber;

export const getDomain = (series: Series, stacked: boolean = false) => {
  let min: number | null = null;
  let max: number | null = null;
  const valuesByTimestamp = series.reduce<{ [timestamp: number]: number[] }>((acc, serie) => {
    serie.points.forEach((point) => {
      const valuesForTimestamp = acc[point.timestamp] || [];
      acc[point.timestamp] = [...valuesForTimestamp, point.value];
    });
    return acc;
  }, {});
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
  return { yMin: min || 0, yMax: max || 0, xMin: minTimestamp, xMax: maxTimestamp };
};

// TODO use the EUI charts theme see src/plugins/charts/public/services/theme/README.md
export const getChartTheme = (isDarkMode: boolean): Theme => {
  return isDarkMode ? DARK_THEME : LIGHT_THEME;
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

export const ChartContainer: React.FC = ({ children }) => (
  <div
    style={{
      width: '100%',
      height: 150,
    }}
  >
    {children}
  </div>
);

export function NoDataState() {
  return (
    <EmptyContainer>
      <EuiText color="subdued" data-test-subj="thresholdRuleNoChartData">
        <FormattedMessage
          id="xpack.observability.threshold.rule..charts.noDataMessage"
          defaultMessage="No chart data available"
        />
      </EuiText>
    </EmptyContainer>
  );
}

export function LoadingState() {
  return (
    <EmptyContainer>
      <EuiText color="subdued" data-test-subj="thresholdRuleLoadingData">
        <EuiLoadingChart size="m" />
      </EuiText>
    </EmptyContainer>
  );
}

export function ErrorState() {
  return (
    <EmptyContainer>
      <EuiText color="subdued" data-test-subj="thresholdRuleChartErrorState">
        <FormattedMessage
          id="xpack.observability.threshold.rule..charts.errorMessage"
          defaultMessage="Uh oh, something went wrong"
        />
      </EuiText>
    </EmptyContainer>
  );
}
