/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useUrlState } from '../../../../../util/url_state';

import {
  defaultSearchQuery,
  getDefaultTrainingFilterQuery,
  useResultsViewConfig,
  DataFrameAnalyticsConfig,
} from '../../../../common';
import { ResultsSearchQuery } from '../../../../common/analytics';

import { DATA_FRAME_TASK_STATE } from '../../../analytics_management/components/analytics_list/common';

import { ExpandableSectionAnalytics } from '../expandable_section';
import { ExplorationResultsTable } from '../exploration_results_table';
import { ExplorationQueryBar } from '../exploration_query_bar';
import { JobConfigErrorCallout } from '../job_config_error_callout';
import { LoadingPanel } from '../loading_panel';
import { FeatureImportanceSummaryPanelProps } from '../total_feature_importance_summary/feature_importance_summary';

const filters = {
  options: [
    {
      id: 'training',
      label: i18n.translate('xpack.ml.dataframe.analytics.explorationResults.trainingSubsetLabel', {
        defaultMessage: 'Training',
      }),
    },
    {
      id: 'testing',
      label: i18n.translate('xpack.ml.dataframe.analytics.explorationResults.testingSubsetLabel', {
        defaultMessage: 'Testing',
      }),
    },
  ],
  columnId: 'ml.is_training',
  key: { training: true, testing: false },
};

export interface EvaluatePanelProps {
  jobConfig: DataFrameAnalyticsConfig;
  jobStatus?: DATA_FRAME_TASK_STATE;
  searchQuery: ResultsSearchQuery;
}

interface Props {
  jobId: string;
  title: string;
  EvaluatePanel: FC<EvaluatePanelProps>;
  FeatureImportanceSummaryPanel: FC<FeatureImportanceSummaryPanelProps>;
  defaultIsTraining?: boolean;
}

export const ExplorationPageWrapper: FC<Props> = ({
  jobId,
  title,
  EvaluatePanel,
  FeatureImportanceSummaryPanel,
  defaultIsTraining,
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

  const [searchQuery, setSearchQuery] = useState<ResultsSearchQuery>(defaultSearchQuery);
  const [globalState, setGlobalState] = useUrlState('_g');
  const [defaultQueryString, setDefaultQueryString] = useState<string | undefined>();

  useEffect(() => {
    if (defaultIsTraining !== undefined && jobConfig !== undefined) {
      // Apply defaultIsTraining filter
      setSearchQuery(
        getDefaultTrainingFilterQuery(jobConfig.dest.results_field, defaultIsTraining)
      );
      setDefaultQueryString(`${jobConfig.dest.results_field}.is_training : ${defaultIsTraining}`);
      // Clear defaultIsTraining from url
      setGlobalState('ml', {
        analysisType: globalState.ml.analysisType,
        jobId: globalState.ml.jobId,
      });
    }
  }, [jobConfig?.dest.results_field]);

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
          <p>{indexPatternErrorMessage}</p>
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

  return (
    <>
      {typeof jobConfig?.description !== 'undefined' && (
        <>
          <EuiText>{jobConfig?.description}</EuiText>
          <EuiSpacer size="m" />
        </>
      )}

      {indexPattern !== undefined && (
        <>
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <EuiSpacer size="s" />
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem>
                  <ExplorationQueryBar
                    indexPattern={indexPattern}
                    setSearchQuery={setSearchQuery}
                    defaultQueryString={defaultQueryString}
                    filters={filters}
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

      {isLoadingJobConfig === true && jobConfig === undefined && <LoadingPanel />}
      {isLoadingJobConfig === false && jobConfig !== undefined && isInitialized === true && (
        <EvaluatePanel jobConfig={jobConfig} jobStatus={jobStatus} searchQuery={searchQuery} />
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
