/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, FC } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

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
import { useData } from '../../hooks/use_data';
import { useUrlState } from '../../hooks/url_state';

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

  const [globalState, setGlobalState] = useUrlState('_g');

  const { overallStats, timefilter } = useData(dataView, setGlobalState);

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
    if (globalState?.time !== undefined) {
      timefilter.setTime({
        from: globalState.time.from,
        to: globalState.time.to,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(globalState?.time), timefilter]);

  useEffect(() => {
    if (globalState?.refreshInterval !== undefined) {
      timefilter.setRefreshInterval(globalState.refreshInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(globalState?.refreshInterval), timefilter]);

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!dataView || !timefilter) return null;

  return (
    <>
      <EuiPageBody data-test-subj="aiOpsIndexPage" paddingSize="none" panelled={false}>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <EuiPageContentHeader className="aiOpsPageHeader">
              <EuiPageContentHeaderSection>
                <div className="aiOpsTitleHeader">
                  <EuiTitle size={'s'}>
                    <h2>{dataView.title}</h2>
                  </EuiTitle>
                </div>
              </EuiPageContentHeaderSection>

              <EuiFlexGroup
                alignItems="center"
                justifyContent="flexEnd"
                gutterSize="s"
                data-test-subj="aiOpsTimeRangeSelectorSection"
              >
                {dataView.timeFieldName !== undefined && (
                  <EuiFlexItem grow={false}>
                    <FullTimeRangeSelector
                      dataView={dataView}
                      query={undefined}
                      disabled={false}
                      timefilter={timefilter}
                    />
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <DatePickerWrapper />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPageContentHeader>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiHorizontalRule />
        <EuiPageContentBody>
          <EuiFlexGroup direction="column">
            {overallStats?.totalCount !== undefined && (
              <EuiFlexItem>
                <DocumentCountContent
                  documentCountStats={overallStats.documentCountStats}
                  totalCount={overallStats.totalCount}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <ProgressControls
                progress={data.loaded}
                progressMessage={data.loadingState ?? ''}
                isRunning={isRunning}
                onRefresh={start}
                onCancel={cancel}
              />
            </EuiFlexItem>
            {data?.changePoints ? (
              <EuiFlexItem>
                <SpikeAnalysisTable changePointData={data.changePoints} />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiPageContentBody>
      </EuiPageBody>
    </>
  );
};
