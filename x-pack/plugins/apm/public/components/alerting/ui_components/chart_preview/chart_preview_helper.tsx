/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingChart } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { Coordinate } from '../../../../../typings/timeseries';

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

export const getDomain = (
  series: Array<{ name?: string; data: Coordinate[] }>
) => {
  const xValues = series.flatMap((item) => item.data.map((d) => d.x));
  const yValues = series.flatMap((item) => item.data.map((d) => d.y || 0));
  return {
    xMax: Math.max(...xValues),
    xMin: Math.min(...xValues),
    yMax: Math.max(...yValues),
    yMin: Math.min(...yValues),
  };
};

const EmptyContainer: React.FC = ({ children }) => (
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
          defaultMessage="Last {lookback} {timeLabel} of data, showing {displayedGroups}/{totalGroups} groups"
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
