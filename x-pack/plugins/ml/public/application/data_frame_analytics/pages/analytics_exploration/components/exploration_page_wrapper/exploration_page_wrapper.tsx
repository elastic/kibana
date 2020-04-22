/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';

import { EuiSpacer } from '@elastic/eui';

import { useResultsViewConfig } from '../../../../common';
import { ResultsSearchQuery, defaultSearchQuery } from '../../../../common/analytics';

import { JobConfigErrorCallout } from '../job_config_error_callout';
import { LoadingPanel } from '../loading_panel';

interface Props {
  jobId: string;
  title: string;
  EvaluatePanel: any;
  ResultsTable: any;
}

export const ExplorationPageWrapper: FC<Props> = ({
  jobId,
  title,
  EvaluatePanel,
  ResultsTable,
}) => {
  const {
    indexPattern,
    isInitialized,
    isLoadingJobConfig,
    jobCapsServiceErrorMessage,
    jobConfig,
    jobConfigErrorMessage,
    jobStatus,
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
      <EuiSpacer />
      {isLoadingJobConfig === true && jobConfig === undefined && <LoadingPanel />}
      {isLoadingJobConfig === false &&
        jobConfig !== undefined &&
        indexPattern !== undefined &&
        isInitialized === true && (
          <ResultsTable
            jobConfig={jobConfig}
            indexPattern={indexPattern}
            jobStatus={jobStatus}
            setEvaluateSearchQuery={setSearchQuery}
            title={title}
          />
        )}
    </>
  );
};
