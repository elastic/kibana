/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, FC } from 'react';

import { EuiButton, EuiFlexGrid, EuiFlexItem, EuiProgress, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useMlKibana } from '../../contexts/kibana';

import { CorrelationChart } from './correlation_chart';
import { useCorrelations } from './use_correlations';

const isErrorMessage = (arg: unknown): arg is Error => {
  return arg instanceof Error;
};

interface CorrelationsProps {
  environment?: string;
  kuery?: string;
  serviceName?: string;
  transactionName?: string;
  transactionType?: string;
  start?: string;
  end?: string;
}

export const Correlations: FC<CorrelationsProps> = (fetchOptions) => {
  const {
    services: { notifications },
  } = useMlKibana();

  const percentileThreshold = 95;

  const {
    error,
    histograms,
    percentileThresholdValue,
    isComplete,
    isRunning,
    progress,
    startFetch,
    cancelFetch,
  } = useCorrelations({
    index: 'apm-*',
    ...{
      ...fetchOptions,
      percentileThreshold,
    },
  });

  // cancel any running async partial request when unmounting the component
  useEffect(() => cancelFetch, []);

  useEffect(() => {
    if (isComplete) {
      notifications.toasts.addSuccess('Finished');
    }
  }, [isComplete]);

  useEffect(() => {
    if (isErrorMessage(error)) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.ml.correlations.error.title', {
          defaultMessage: 'An error occurred fetching correlations',
        }),
        text: error.toString(),
      });
    }
  }, [error]);

  return (
    <>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.ml.correlations.description', {
            defaultMessage:
              'What is slowing down my service? Correlations will help discover a slower performance in a particular cohort of your data.',
          })}
        </p>
      </EuiText>

      <EuiSpacer size="s" />

      {!isRunning && <EuiButton onClick={startFetch}>Start</EuiButton>}
      {isRunning && <EuiButton onClick={cancelFetch}>Cancel</EuiButton>}

      <EuiSpacer size="s" />

      <EuiProgress value={Math.round(progress * 100)} max={100} size="m" />

      <EuiSpacer size="s" />

      <EuiFlexGrid columns={1} gutterSize="none">
        {histograms.map((histogram) => (
          <EuiFlexItem>
            <CorrelationChart
              markerPercentile={percentileThreshold}
              markerValue={percentileThresholdValue}
              {...histogram}
              key={`${histogram.field}:${histogram.value}`}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </>
  );
};
