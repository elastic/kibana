/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState } from 'react';
import { EuiCallOut, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useResultsViewConfig } from '../../../../common';
import { EvaluatePanel } from './evaluate_panel';
import { ResultsTable } from './results_table';
import { ResultsSearchQuery, defaultSearchQuery } from '../../../../common/analytics';
import { LoadingPanel } from '../loading_panel';

export const ExplorationTitle: React.FC<{ jobId: string }> = ({ jobId }) => (
  <EuiTitle size="xs">
    <span>
      {i18n.translate('xpack.ml.dataframe.analytics.regressionExploration.tableJobIdTitle', {
        defaultMessage: 'Destination index for regression job ID {jobId}',
        values: { jobId },
      })}
    </span>
  </EuiTitle>
);

const jobConfigErrorTitle = i18n.translate(
  'xpack.ml.dataframe.analytics.regressionExploration.jobConfigurationFetchError',
  {
    defaultMessage:
      'Unable to fetch results. An error occurred loading the job configuration data.',
  }
);

const jobCapsErrorTitle = i18n.translate(
  'xpack.ml.dataframe.analytics.regressionExploration.jobCapsFetchError',
  {
    defaultMessage: "Unable to fetch results. An error occurred loading the index's field data.",
  }
);

interface Props {
  jobId: string;
}

export const RegressionExploration: FC<Props> = ({ jobId }) => {
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
      <EuiPanel grow={false}>
        <ExplorationTitle jobId={jobId} />
        <EuiSpacer />
        <EuiCallOut
          title={jobConfigErrorMessage ? jobConfigErrorTitle : jobCapsErrorTitle}
          color="danger"
          iconType="cross"
        >
          <p>{jobConfigErrorMessage ? jobConfigErrorMessage : jobCapsServiceErrorMessage}</p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  return (
    <Fragment>
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
          />
        )}
    </Fragment>
  );
};
