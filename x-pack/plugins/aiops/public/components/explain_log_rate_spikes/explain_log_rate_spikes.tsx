/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, FC } from 'react';

import { EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';

import type { DataView } from '@kbn/data-views-plugin/public';
import { ProgressControls } from '@kbn/aiops-components';
import { useFetchStream } from '@kbn/aiops-utils';
import type { WindowParameters } from '@kbn/aiops-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { initialState, streamReducer } from '../../../common/api/stream_reducer';
import type { ApiExplainLogRateSpikes } from '../../../common/api';

/**
 * ExplainLogRateSpikes props require a data view.
 */
export interface ExplainLogRateSpikesProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** Window parameters for the analysis */
  windowParameters: WindowParameters;
}

export const ExplainLogRateSpikes: FC<ExplainLogRateSpikesProps> = ({
  dataView,
  windowParameters,
}) => {
  const kibana = useKibana();
  const basePath = kibana.services.http?.basePath.get() ?? '';

  const { cancel, start, data, isRunning } = useFetchStream<
    ApiExplainLogRateSpikes,
    typeof basePath
  >(
    `${basePath}/internal/aiops/explain_log_rate_spikes`,
    {
      // TODO Consider actual user selected time ranges.
      // Since we already receive window parameters here,
      // we just set a maximum time range of 1970-2038 here.
      start: 0,
      end: 2147483647000,
      // TODO Consider an optional Kuery.
      kuery: '',
      // TODO Handle data view without time fields.
      timeFieldName: dataView.timeFieldName ?? '',
      index: dataView.title,
      ...windowParameters,
    },
    { reducer: streamReducer, initialState }
  );

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EuiText>
      <h2>{dataView.title}</h2>
      <ProgressControls
        progress={data.loaded}
        progressMessage={data.loadingState ?? ''}
        isRunning={isRunning}
        onRefresh={start}
        onCancel={cancel}
      />
      <EuiSpacer size="xs" />
      <EuiCodeBlock language="json" fontSize="s" paddingSize="s">
        {JSON.stringify(data, null, 2)}
      </EuiCodeBlock>
    </EuiText>
  );
};
