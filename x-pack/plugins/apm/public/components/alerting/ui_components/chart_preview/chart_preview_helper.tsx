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
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { TooltipValue } from '@elastic/charts';

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

interface LookbackTimeLabel {
  lookback: number;
  timeLabel: string;
}

export function TimeLabelForData({ lookback, timeLabel }: LookbackTimeLabel) {
  return (
    <div style={{ textAlign: 'center' }}>
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="xpack.apm.alerts.timeLabelForData"
          defaultMessage="Last {lookback} {timeLabel} of data for 3 groups"
          values={{
            lookback,
            timeLabel,
          }}
        />
      </EuiText>
    </div>
  );
}
