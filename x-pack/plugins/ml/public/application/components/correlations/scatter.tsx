/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, FC } from 'react';

import { EuiButton, EuiProgress, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useMlKibana } from '../../contexts/kibana';

// Separate imports for lazy loadable VegaChart and related code
import { VegaChart } from '../vega_chart';

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

export const Scatter: FC<CorrelationsProps> = (fetchOptions) => {
  const {
    services: { notifications },
  } = useMlKibana();

  const [allScatter, setAllScatter] = useState([]);

  const {
    error,
    scatter,
    isComplete,
    isRunning,
    progress,
    startFetch,
    cancelFetch,
  } = useCorrelations({
    index: 'apm-*',
    ...fetchOptions,
  });

  // cancel any running async partial request when unmounting the component
  useEffect(() => cancelFetch, []);

  useEffect(() => {
    const newAllScatter = allScatter
      .map((d) => {
        d.status = 'old';
        return d;
      })
      .concat(
        scatter.map((d) => {
          d.status = 'new';
          return d;
        })
      );
    setAllScatter(newAllScatter);
  }, [JSON.stringify(scatter)]);

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

  const vegaSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    description: 'A scatterplot with delta updates',
    width: 400,
    height: 400,
    data: { values: allScatter },
    mark: 'point',
    encoding: {
      x: { field: 'correlation', type: 'quantitative' },
      y: { field: 'docCount', type: 'quantitative', scale: { type: 'log' } },
      color: { field: 'status' },
    },
  };

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

      <VegaChart vegaSpec={vegaSpec} />
    </>
  );
};
