/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, FC } from 'react';

import { EuiBadge, EuiSpacer, EuiText } from '@elastic/eui';

import type { DataView } from '@kbn/data-views-plugin/public';
import { useFetchStream } from '@kbn/aiops-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { initialState, streamReducer } from '../../../common/api/stream_reducer';
import type { ApiExplainLogRateSpikes } from '../../../common/api';

/**
 * ExplainLogRateSpikes props require a data view.
 */
export interface ExplainLogRateSpikesProps {
  /** The data view to analyze. */
  dataView: DataView;
}

export const ExplainLogRateSpikes: FC<ExplainLogRateSpikesProps> = ({ dataView }) => {
  const kibana = useKibana();
  const basePath = kibana.services.http?.basePath.get() ?? '';

  const { start, data, isRunning } = useFetchStream<ApiExplainLogRateSpikes, typeof basePath>(
    `${basePath}/internal/aiops/explain_log_rate_spikes`,
    { index: dataView.title },
    { reducer: streamReducer, initialState }
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
