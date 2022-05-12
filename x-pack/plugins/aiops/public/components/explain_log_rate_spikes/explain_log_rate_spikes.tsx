/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, FC } from 'react';

import { EuiBadge, EuiSpacer } from '@elastic/eui';

import {
  API_ACTION_NAME,
  AiopsExplainLogRateSpikesApiAction,
} from '../../../common/api/explain_log_rate_spikes';

import { useStreamFetchReducer } from '../../hooks/use_stream_fetch_reducer';

interface StreamState {
  fields: string[];
}

const initialState: StreamState = {
  fields: [],
};

function streamReducer(
  state: StreamState,
  action: AiopsExplainLogRateSpikesApiAction | AiopsExplainLogRateSpikesApiAction[]
): StreamState {
  if (Array.isArray(action)) {
    return action.reduce(streamReducer, state);
  }

  switch (action.type) {
    case API_ACTION_NAME.ADD_FIELDS:
      return {
        fields: [...state.fields, ...action.payload],
      };
    default:
      return state;
  }
}

export const ExplainLogRateSpikes: FC = () => {
  const { start, data, isRunning } = useStreamFetchReducer(
    '/internal/aiops/explain_log_rate_spikes',
    streamReducer,
    initialState,
    { index: 'my-index' }
  );

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <p>{isRunning ? 'Loading fields ...' : 'Loaded all fields.'}</p>
      <EuiSpacer />
      {data.fields.map((field) => (
        <EuiBadge>{field}</EuiBadge>
      ))}
    </>
  );
};
