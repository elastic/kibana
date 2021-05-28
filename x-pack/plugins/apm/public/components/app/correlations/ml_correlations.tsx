/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';

import {
  EuiButton,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';

import { CorrelationsChart } from './correlations_chart';
import {
  CorrelationsTable,
  SelectedSignificantTerm,
} from './correlations_table';
import { useCorrelations } from './use_correlations';

const isErrorMessage = (arg: unknown): arg is Error => {
  return arg instanceof Error;
};

interface Props {
  onClose: () => void;
}

export function MlCorrelations({ onClose }: Props) {
  const {
    core: { notifications },
  } = useApmPluginContext();

  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams } = useUrlParams();

  const fetchOptions = {
    ...{
      serviceName,
      ...urlParams,
    },
  };

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
  // we want this effect to execute exactly once after the component mounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => cancelFetch, []);

  useEffect(() => {
    if (isComplete) {
      notifications.toasts.addSuccess('Finished');
    }
  }, [isComplete, notifications.toasts]);

  useEffect(() => {
    if (isErrorMessage(error)) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.apm.correlations.error.title', {
          defaultMessage: 'An error occurred fetching correlations',
        }),
        text: error.toString(),
      });
    }
  }, [error, notifications.toasts]);

  const [
    selectedSignificantTerm,
    setSelectedSignificantTerm,
  ] = useState<SelectedSignificantTerm | null>(null);

  let selectedHistogram = histograms.length > 0 ? histograms[0] : undefined;

  if (histograms.length > 0 && selectedSignificantTerm !== null) {
    selectedHistogram = histograms.find(
      (h) =>
        h.field === selectedSignificantTerm.fieldName &&
        h.value === selectedSignificantTerm.fieldValue
    );
  }

  return (
    <>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.apm.correlations.description', {
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

      {histograms.length > 0 && (
        <>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.apm.correlations.latency.chart.title', {
                defaultMessage: 'Latency distribution',
              })}
            </h4>
          </EuiTitle>

          <CorrelationsChart
            markerPercentile={percentileThreshold}
            markerValue={percentileThresholdValue}
            {...selectedHistogram}
            key={`${selectedHistogram.field}:${selectedHistogram.value}`}
          />

          <EuiSpacer size="s" />

          <CorrelationsTable
            percentageColumnName={i18n.translate(
              'xpack.apm.correlations.latency.percentageColumnName',
              { defaultMessage: '% of slow transactions' }
            )}
            significantTerms={histograms.map((d) => ({
              fieldName: d.field,
              fieldValue: d.value,
              impact: d.correlation,
              percentage: d.correlation,
            }))}
            status={FETCH_STATUS.SUCCESS}
            setSelectedSignificantTerm={setSelectedSignificantTerm}
            onFilter={onClose}
          />
        </>
      )}
    </>
  );
}
