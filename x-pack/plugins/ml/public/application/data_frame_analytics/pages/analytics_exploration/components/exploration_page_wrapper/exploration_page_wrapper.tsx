/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useState } from 'react';

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { getAnalysisType, getDependentVar } from '../../../../../../../common/util/analytics_utils';

import { useScatterplotFieldOptions } from '../../../../../components/scatterplot_matrix';

import {
  defaultSearchQuery,
  getScatterplotMatrixLegendType,
  useResultsViewConfig,
  DataFrameAnalyticsConfig,
  getDestinationIndex,
} from '../../../../common';
import { ResultsSearchQuery, ANALYSIS_CONFIG_TYPE } from '../../../../common/analytics';

import { DataFrameTaskStateType } from '../../../analytics_management/components/analytics_list/common';

import { ExpandableSectionAnalytics, ExpandableSectionSplom } from '../expandable_section';
import { ExplorationResultsTable } from '../exploration_results_table';
import { ExplorationQueryBar } from '../exploration_query_bar';
import { JobConfigErrorCallout } from '../job_config_error_callout';
import { LoadingPanel } from '../loading_panel';
import { FeatureImportanceSummaryPanelProps } from '../total_feature_importance_summary/feature_importance_summary';
import { useExplorationUrlState } from '../../hooks/use_exploration_url_state';
import { ExplorationQueryBarProps } from '../exploration_query_bar/exploration_query_bar';
import { IndexPatternPrompt } from '../index_pattern_prompt';

function getFilters(resultsField: string) {
  return {
    options: [
      {
        id: 'training',
        label: i18n.translate(
          'xpack.ml.dataframe.analytics.explorationResults.trainingSubsetLabel',
          {
            defaultMessage: 'Training',
          }
        ),
      },
      {
        id: 'testing',
        label: i18n.translate(
          'xpack.ml.dataframe.analytics.explorationResults.testingSubsetLabel',
          {
            defaultMessage: 'Testing',
          }
        ),
      },
    ],
    columnId: `${resultsField}.is_training`,
    key: { training: true, testing: false },
  };
}

export interface EvaluatePanelProps {
  jobConfig: DataFrameAnalyticsConfig;
  jobStatus?: DataFrameTaskStateType;
  searchQuery: ResultsSearchQuery;
}

interface Props {
  jobId: string;
  title: string;
  EvaluatePanel: FC<EvaluatePanelProps>;
  FeatureImportanceSummaryPanel: FC<FeatureImportanceSummaryPanelProps>;
}

export const ExplorationPageWrapper: FC<Props> = ({
  jobId,
  title,
  EvaluatePanel,
  FeatureImportanceSummaryPanel,
}) => {
  const {
    indexPattern,
    indexPatternErrorMessage,
    isInitialized,
    isLoadingJobConfig,
    jobCapsServiceErrorMessage,
    jobConfig,
    jobConfigErrorMessage,
    jobStatus,
    needsDestIndexPattern,
    totalFeatureImportance,
  } = useResultsViewConfig(jobId);

  const [pageUrlState, setPageUrlState] = useExplorationUrlState();

  const [searchQuery, setSearchQuery] = useState<ResultsSearchQuery>(defaultSearchQuery);

  const searchQueryUpdateHandler: ExplorationQueryBarProps['setSearchQuery'] = useCallback(
    (update) => {
      if (update.query) {
        setSearchQuery(update.query);
      }
      if (update.queryString !== pageUrlState.queryText) {
        setPageUrlState({ queryText: update.queryString, queryLanguage: update.language });
      }
    },
    [pageUrlState, setPageUrlState]
  );

  const query: ExplorationQueryBarProps['query'] = {
    query: pageUrlState.queryText,
    language: pageUrlState.queryLanguage,
  };

  const resultsField = jobConfig?.dest.results_field ?? '';
  const destIndex = getDestinationIndex(jobConfig);

  const scatterplotFieldOptions = useScatterplotFieldOptions(
    indexPattern,
    jobConfig?.analyzed_fields?.includes,
    jobConfig?.analyzed_fields?.excludes,
    resultsField
  );

  if (indexPatternErrorMessage !== undefined) {
    return (
      <EuiPanel grow={false}>
        <EuiCallOut
          title={i18n.translate('xpack.ml.dataframe.analytics.exploration.indexError', {
            defaultMessage: 'An error occurred loading the index data.',
          })}
          color="danger"
          iconType="cross"
        >
          <p>
            {indexPatternErrorMessage}
            {needsDestIndexPattern ? (
              <IndexPatternPrompt destIndex={destIndex} color="text" />
            ) : null}
          </p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  if (jobConfigErrorMessage !== undefined || jobCapsServiceErrorMessage !== undefined) {
    return (
      <JobConfigErrorCallout
        jobCapsServiceErrorMessage={jobCapsServiceErrorMessage}
        jobConfigErrorMessage={jobConfigErrorMessage}
        title={title}
      />
    );
  }

  const jobType =
    jobConfig && jobConfig.analysis ? getAnalysisType(jobConfig?.analysis) : undefined;

  return (
    <>
      {typeof jobConfig?.description !== 'undefined' && jobConfig?.description !== '' && (
        <>
          <EuiText>{jobConfig?.description}</EuiText>
          <EuiSpacer size="m" />
        </>
      )}

      {indexPattern !== undefined && jobConfig && (
        <>
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <EuiSpacer size="s" />
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem>
                  <ExplorationQueryBar
                    indexPattern={indexPattern}
                    setSearchQuery={searchQueryUpdateHandler}
                    query={query}
                    filters={getFilters(jobConfig.dest.results_field!)}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      )}

      {isLoadingJobConfig === true && jobConfig === undefined && <LoadingPanel />}
      {isLoadingJobConfig === false && jobConfig !== undefined && isInitialized === true && (
        <ExpandableSectionAnalytics jobId={jobConfig.id} />
      )}

      {isLoadingJobConfig === true && jobConfig === undefined && <LoadingPanel />}
      {isLoadingJobConfig === false && jobConfig !== undefined && isInitialized === true && (
        <EvaluatePanel jobConfig={jobConfig} jobStatus={jobStatus} searchQuery={searchQuery} />
      )}

      {isLoadingJobConfig === true &&
        jobConfig !== undefined &&
        totalFeatureImportance === undefined && <LoadingPanel />}
      {isLoadingJobConfig === false &&
        jobConfig !== undefined &&
        totalFeatureImportance !== undefined && (
          <>
            <FeatureImportanceSummaryPanel
              totalFeatureImportance={totalFeatureImportance}
              jobConfig={jobConfig}
            />
          </>
        )}

      <EuiSpacer size="m" />

      {isLoadingJobConfig === true && jobConfig === undefined && <LoadingPanel />}
      {isLoadingJobConfig === false &&
        jobConfig !== undefined &&
        isInitialized === true &&
        typeof jobConfig?.id === 'string' &&
        scatterplotFieldOptions.length > 1 &&
        typeof jobConfig?.analysis !== 'undefined' && (
          <ExpandableSectionSplom
            fields={scatterplotFieldOptions}
            index={jobConfig?.dest.index}
            color={
              jobType === ANALYSIS_CONFIG_TYPE.REGRESSION ||
              jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION
                ? getDependentVar(jobConfig.analysis)
                : undefined
            }
            legendType={getScatterplotMatrixLegendType(jobType)}
            searchQuery={searchQuery}
          />
        )}

      {isLoadingJobConfig === true && jobConfig === undefined && <LoadingPanel />}
      {isLoadingJobConfig === false &&
        jobConfig !== undefined &&
        indexPattern !== undefined &&
        isInitialized === true && (
          <ExplorationResultsTable
            indexPattern={indexPattern}
            jobConfig={jobConfig}
            jobStatus={jobStatus}
            needsDestIndexPattern={needsDestIndexPattern}
            searchQuery={searchQuery}
          />
        )}
    </>
  );
};
