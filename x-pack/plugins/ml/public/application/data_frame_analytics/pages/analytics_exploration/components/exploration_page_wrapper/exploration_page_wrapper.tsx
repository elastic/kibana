/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';

import { EuiSpacer } from '@elastic/eui';

import { useResultsViewConfig, DataFrameAnalyticsConfig } from '../../../../common';
import { ResultsSearchQuery, defaultSearchQuery } from '../../../../common/analytics';

import { DATA_FRAME_TASK_STATE } from '../../../analytics_management/components/analytics_list/common';

import { ExplorationResultsTable } from '../exploration_results_table';
import { JobConfigErrorCallout } from '../job_config_error_callout';
import { LoadingPanel } from '../loading_panel';
import { FeatureImportanceSummaryPanelProps } from '../total_feature_importance_summary/feature_importance_summary';

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
}

export const ExplorationPageWrapper: FC<Props> = ({
  jobId,
  title,
  EvaluatePanel,
  FeatureImportanceSummaryPanel,
}) => {
  const {
    indexPattern,
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
      {isLoadingJobConfig === true && jobConfig === undefined && <LoadingPanel />}
      {isLoadingJobConfig === false && jobConfig !== undefined && isInitialized === true && (
        <EvaluatePanel jobConfig={jobConfig} jobStatus={jobStatus} searchQuery={searchQuery} />
      )}
      {isLoadingJobConfig === true && totalFeatureImportance === undefined && <LoadingPanel />}
      {isLoadingJobConfig === false && totalFeatureImportance !== undefined && (
        <>
          <EuiSpacer />
          <FeatureImportanceSummaryPanel totalFeatureImportance={totalFeatureImportance} />
        </>
      )}

      <EuiSpacer />
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
            setEvaluateSearchQuery={setSearchQuery}
            title={title}
          />
        )}
    </>
  );
};
