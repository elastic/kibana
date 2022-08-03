/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, FC } from 'react';

import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';

import type { DataView } from '@kbn/data-views-plugin/public';
import { ProgressControls } from '@kbn/aiops-components';
import { useFetchStream } from '@kbn/aiops-utils';
import type { WindowParameters } from '@kbn/aiops-utils';
import { i18n } from '@kbn/i18n';
import type { ChangePoint } from '@kbn/ml-agg-utils';
import type { Query } from '@kbn/es-query';

import { useAiOpsKibana } from '../../kibana_context';
import { initialState, streamReducer } from '../../../common/api/stream_reducer';
import type { ApiExplainLogRateSpikes } from '../../../common/api';

import { SpikeAnalysisTable } from '../spike_analysis_table';

/**
 * ExplainLogRateSpikes props require a data view.
 */
interface ExplainLogRateSpikesAnalysisProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** Start timestamp filter */
  earliest: number;
  /** End timestamp filter */
  latest: number;
  /** Window parameters for the analysis */
  windowParameters: WindowParameters;
  searchQuery: Query['query'];
  onPinnedChangePoint?: (changePoint: ChangePoint | null) => void;
  onSelectedChangePoint?: (changePoint: ChangePoint | null) => void;
  selectedChangePoint?: ChangePoint;
}

export const ExplainLogRateSpikesAnalysis: FC<ExplainLogRateSpikesAnalysisProps> = ({
  dataView,
  earliest,
  latest,
  windowParameters,
  searchQuery,
  onPinnedChangePoint,
  onSelectedChangePoint,
  selectedChangePoint,
}) => {
  const { services } = useAiOpsKibana();
  const basePath = services.http?.basePath.get() ?? '';

  const {
    cancel,
    start,
    data,
    isRunning,
    error: streamError,
  } = useFetchStream<ApiExplainLogRateSpikes, typeof basePath>(
    `${basePath}/internal/aiops/explain_log_rate_spikes`,
    {
      start: earliest,
      end: latest,
      searchQuery: JSON.stringify(searchQuery),
      // TODO Handle data view without time fields.
      timeFieldName: dataView.timeFieldName ?? '',
      index: dataView.title,
      ...windowParameters,
    },
    { reducer: streamReducer, initialState }
  );

  const errors = useMemo(
    () => [...(streamError ? [streamError] : []), ...data.errors],
    [streamError, data.errors]
  );

  // Start handler clears possibly hovered or pinned
  // change points on analysis refresh.
  function startHandler() {
    if (onPinnedChangePoint) {
      onPinnedChangePoint(null);
    }
    if (onSelectedChangePoint) {
      onSelectedChangePoint(null);
    }
    start();
  }

  useEffect(() => {
    startHandler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <ProgressControls
        progress={data.loaded}
        progressMessage={data.loadingState ?? ''}
        isRunning={isRunning}
        onRefresh={startHandler}
        onCancel={cancel}
      />
      <EuiSpacer size="xs" />
      {errors.length > 0 && (
        <EuiCallOut
          title={i18n.translate('xpack.aiops.analysis.errorCallOutTitle', {
            defaultMessage:
              'The following {errorCount, plural, one {error} other {errors}} occurred running the analysis.',
            values: { errorCount: errors.length },
          })}
          color="warning"
          iconType="alert"
          size="s"
        >
          <EuiText size="s">
            {errors.length === 1 && <p>{errors[0]}</p>}
            {errors.length > 1 && (
              <ul>
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </EuiText>
        </EuiCallOut>
      )}
      {data?.changePoints ? (
        <SpikeAnalysisTable
          changePoints={data.changePoints}
          loading={isRunning}
          onPinnedChangePoint={onPinnedChangePoint}
          onSelectedChangePoint={onSelectedChangePoint}
          selectedChangePoint={selectedChangePoint}
        />
      ) : null}
    </>
  );
};
