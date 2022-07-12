/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, FC } from 'react';

import type { DataView } from '@kbn/data-views-plugin/public';
import { ProgressControls } from '@kbn/aiops-components';
import { useFetchStream } from '@kbn/aiops-utils';
import type { WindowParameters } from '@kbn/aiops-utils';

import { useAiOpsKibana } from '../../kibana_context';
import { initialState, streamReducer } from '../../../common/api/stream_reducer';
import type { ApiExplainLogRateSpikes } from '../../../common/api';
import { SpikeAnalysisTable } from '../spike_analysis_table';

/**
 * ExplainLogRateSpikes props require a data view.
 */
export interface ExplainLogRateSpikesProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** Start timestamp filter */
  earliest: number;
  /** End timestamp filter */
  latest: number;
  /** Window parameters for the analysis */
  windowParameters: WindowParameters;
}

export const ExplainLogRateSpikes: FC<ExplainLogRateSpikesProps> = ({
  dataView,
  earliest,
  latest,
  windowParameters,
}) => {
  const { services } = useAiOpsKibana();
  const basePath = services.http?.basePath.get() ?? '';

  const { cancel, start, data, isRunning, error } = useFetchStream<
    ApiExplainLogRateSpikes,
    typeof basePath
  >(
    `${basePath}/internal/aiops/explain_log_rate_spikes`,
    {
      start: earliest,
      end: latest,
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
    <>
      <ProgressControls
        progress={data.loaded}
        progressMessage={data.loadingState ?? ''}
        isRunning={isRunning}
        onRefresh={start}
        onCancel={cancel}
      />
      {data?.changePoints ? (
        <SpikeAnalysisTable changePointData={data.changePoints} loading={isRunning} error={error} />
      ) : null}
    </>
  );
};
