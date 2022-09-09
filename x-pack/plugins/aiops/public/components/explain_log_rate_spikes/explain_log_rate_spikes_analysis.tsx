/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState, FC } from 'react';
import { isEqual } from 'lodash';

import { EuiCallOut, EuiEmptyPrompt, EuiSpacer, EuiText } from '@elastic/eui';

import type { DataView } from '@kbn/data-views-plugin/public';
import { ProgressControls } from '@kbn/aiops-components';
import { useFetchStream } from '@kbn/aiops-utils';
import type { WindowParameters } from '@kbn/aiops-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ChangePoint } from '@kbn/ml-agg-utils';
import type { Query } from '@kbn/es-query';

import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { initialState, streamReducer } from '../../../common/api/stream_reducer';
import type { ApiExplainLogRateSpikes } from '../../../common/api';

import { SpikeAnalysisGroupsTable } from '../spike_analysis_table';
// import { SpikeAnalysisTable } from '../spike_analysis_table';
// TODO: remove once api is in place
import { mockData } from './mock_data';

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
  const { http } = useAiopsAppContext();
  const basePath = http.basePath.get() ?? '';

  const [currentAnalysisWindowParameters, setCurrentAnalysisWindowParameters] = useState<
    WindowParameters | undefined
  >();

  const {
    cancel,
    start,
    data,
    isRunning,
    errors: streamErrors,
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

  const errors = useMemo(() => [...streamErrors, ...data.errors], [streamErrors, data.errors]);

  // Start handler clears possibly hovered or pinned
  // change points on analysis refresh.
  function startHandler() {
    if (onPinnedChangePoint) {
      onPinnedChangePoint(null);
    }
    if (onSelectedChangePoint) {
      onSelectedChangePoint(null);
    }

    setCurrentAnalysisWindowParameters(windowParameters);
    start();
  }

  useEffect(() => {
    setCurrentAnalysisWindowParameters(windowParameters);
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupTableItems = useMemo(() => {
    // Loop through to create map of field value counts e.g. { log.logger.keyword: { request: 3, publisher_pipeline_output: 1 }, http.request.method.keyword: { POST: 1 } }...
    // Loop through again to remove duplicate values and create table items like { id: 1, group: {...}, doc_count }
    const groupFieldValuesCountMap = mockData.reduce((countMap, current) => {
      // If field name/key exists, increase count else create it and set count to 1
      Object.keys(current).forEach((fieldName) => {
        const fieldNameCountMap = countMap[fieldName];
        // @ts-ignore // TODO: remove once we have real data
        const fieldValue = current[fieldName];
        if (fieldNameCountMap === undefined) {
          countMap[fieldName] = { [fieldValue]: 1 }
        }  else if (fieldNameCountMap[fieldValue] === undefined) {
          fieldNameCountMap[fieldValue] = 1;
        } else {
          fieldNameCountMap[fieldValue] += 1;
        }
      });

      return countMap;
    }, {} as Record<string, Record<string, number>>);

    const tableItems = mockData.map((group, index) => {
      const dedupedGroup = {};
      const repeatedValues = {};
      
      for(const fieldName in group) {
        if (fieldName === 'doc_count') continue;
        // @ts-ignore // TODO: remove once we have real data
        const fieldValue = group[fieldName];
        if (groupFieldValuesCountMap[fieldName][fieldValue] <= 2) {
          // @ts-ignore // TODO: remove once we have real data
          dedupedGroup[fieldName] = fieldValue;
        } else {
           // @ts-ignore // TODO: remove once we have real data
          repeatedValues[fieldName] = fieldValue;
        }
      }

      return {
        id: index,
        docCount: group.doc_count,
        group: dedupedGroup,
        repeatedValues,
      }
    });

    return tableItems;
  }, []);

  const shouldRerunAnalysis = useMemo(
    () =>
      currentAnalysisWindowParameters !== undefined &&
      !isEqual(currentAnalysisWindowParameters, windowParameters),
    [currentAnalysisWindowParameters, windowParameters]
  );

  const showSpikeAnalysisTable = data?.changePoints.length > 0;

  return (
    <div data-test-subj="aiopsExplainLogRateSpikesAnalysis">
      <ProgressControls
        progress={data.loaded}
        progressMessage={data.loadingState ?? ''}
        isRunning={isRunning}
        onRefresh={startHandler}
        onCancel={cancel}
        shouldRerunAnalysis={shouldRerunAnalysis}
      />
      <EuiSpacer size="xs" />
      {!isRunning && !showSpikeAnalysisTable && (
        <EuiEmptyPrompt
          data-test-subj="aiopsNoResultsFoundEmptyPrompt"
          title={
            <h2>
              <FormattedMessage
                id="xpack.aiops.explainLogRateSpikesPage.noResultsPromptTitle"
                defaultMessage="The analysis did not return any results."
              />
            </h2>
          }
          titleSize="xs"
          body={
            <p>
              <FormattedMessage
                id="xpack.aiops.explainLogRateSpikesPage.noResultsPromptBody"
                defaultMessage="Try to adjust the baseline and deviation time ranges and rerun the analysis. If you still get no results, there might be no statistically significant entities contributing to this spike in log rates."
              />
            </p>
          }
        />
      )}
      {errors.length > 0 && (
        <>
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
              {errors.length === 1 ? (
                <p>{errors[0]}</p>
              ) : (
                <ul>
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </EuiText>
          </EuiCallOut>
          <EuiSpacer size="xs" />
        </>
      )}
      {showSpikeAnalysisTable && (
        <SpikeAnalysisGroupsTable
          changePoints={data.changePoints}
          groupTableItems={groupTableItems}
          loading={isRunning}
          onPinnedChangePoint={onPinnedChangePoint}
          onSelectedChangePoint={onSelectedChangePoint}
          selectedChangePoint={selectedChangePoint}
          dataViewId={dataView.id}
        />
      )}
    </div>
  );
};
