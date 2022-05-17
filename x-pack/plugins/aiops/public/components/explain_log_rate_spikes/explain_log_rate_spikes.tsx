/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, FC } from 'react';

import { EuiBadge, EuiSpacer, EuiText } from '@elastic/eui';

import type { DataView } from '@kbn/data-views-plugin/public';

import { useStreamFetchReducer } from '../../hooks/use_stream_fetch_reducer';

import { initialState, streamReducer } from './stream_reducer';

/**
 * ExplainLogRateSpikes props require a data view.
 */
export interface ExplainLogRateSpikesProps {
  /** The data view to analyze. */
  dataView: DataView;
}

export const ExplainLogRateSpikes: FC<ExplainLogRateSpikesProps> = ({ dataView }) => {
  const { start, data, isRunning } = useStreamFetchReducer(
    '/internal/aiops/explain_log_rate_spikes',
    streamReducer,
    initialState,
    { index: dataView.title }
  );

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EuiText>
      <h2>{dataView.title}</h2>
      <p>{isRunning ? 'Loading fields ...' : 'Loaded all fields.'}</p>
      <EuiSpacer size="xs" />
      {data.fields.map((field) => (
        <EuiBadge>{field}</EuiBadge>
      ))}
    </EuiText>
  );
};
