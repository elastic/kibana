/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, FC } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer, EuiText } from '@elastic/eui';

import type { DataView } from '@kbn/data-views-plugin/public';
import { ProgressControls } from '@kbn/aiops-components';
import { useFetchStream } from '@kbn/aiops-utils';
import type { WindowParameters } from '@kbn/aiops-utils';

import { useAiOpsKibana } from '../../kibana_context';
import { initialState, streamReducer } from '../../../common/api/stream_reducer';
import type { ApiExplainLogRateSpikes } from '../../../common/api';
import { SpikeAnalysisTable } from '../spike_analysis_table';
import { FullTimeRangeSelector } from '../full_time_range_selector';
import { DocumentCountContent } from '../document_count_content/document_count_content';
import { DatePickerWrapper } from '../date_picker_wrapper';
import { useTimefilter } from '../../hooks/use_timefilter';

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
  const { services } = useAiOpsKibana();
  const basePath = services.http?.basePath.get() ?? '';
  const timefilter = useTimefilter({
    timeRangeSelector: dataView?.timeFieldName !== undefined,
    autoRefreshSelector: true,
  });

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

  if (!dataView || !timefilter) return null;

  // GET these values from timepicker
  // move timefilter logic (currently in DatePickerWrapper) in here so we can fetch both the log rate spike and histogram data
  const searchParams = {
    earliest: 1655337859000,
    latest: 1658015136000,
    intervalMs: 43200000,
    index: dataView.id,
    timeFieldName: dataView.timeFieldName,
    runtimeFieldMap: {},
    searchQuery: { match_all: {} },
  }; // here for histogram

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText>
            <h2>{dataView.title}</h2>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <FullTimeRangeSelector
                timefilter={timefilter}
                dataView={dataView}
                query={{ match_all: {} }}
                disabled={false}
                callback={() => {}}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DatePickerWrapper />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* @ts-ignore */}
      <DocumentCountContent searchParams={searchParams} />
      <EuiSpacer size="xs" />
      <EuiHorizontalRule />
      <ProgressControls
        progress={data.loaded}
        progressMessage={data.loadingState ?? ''}
        isRunning={isRunning}
        onRefresh={start}
        onCancel={cancel}
      />
      {data?.changePoints ? <SpikeAnalysisTable changePointData={data.changePoints} /> : null}
    </>
  );
};
