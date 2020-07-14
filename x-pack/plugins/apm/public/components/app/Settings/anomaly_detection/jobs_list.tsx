/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { FETCH_STATUS } from '../../../../hooks/useFetcher';
import { ITableColumn, ManagedTable } from '../../../shared/ManagedTable';
import { LoadingStatePrompt } from '../../../shared/LoadingStatePrompt';
import { MLJobLink } from '../../../shared/Links/MachineLearningLinks/MLJobLink';
import { MLLink } from '../../../shared/Links/MachineLearningLinks/MLLink';
import { getEnvironmentLabel } from '../../../../../common/environment_filter_values';
import { LegacyJobsCallout } from './legacy_jobs_callout';
import { AnomalyDetectionApiResponse } from './index';

type Jobs = AnomalyDetectionApiResponse['jobs'];

const columns: Array<ITableColumn<Jobs[0]>> = [
  {
    field: 'environment',
    name: i18n.translate(
      'xpack.apm.settings.anomalyDetection.jobList.environmentColumnLabel',
      { defaultMessage: 'Environment' }
    ),
    render: getEnvironmentLabel,
  },
  {
    field: 'job_id',
    align: 'right',
    name: i18n.translate(
      'xpack.apm.settings.anomalyDetection.jobList.actionColumnLabel',
      { defaultMessage: 'Action' }
    ),
    render: (jobId: string) => (
      <MLJobLink jobId={jobId}>
        {i18n.translate(
          'xpack.apm.settings.anomalyDetection.jobList.mlJobLinkText',
          {
            defaultMessage: 'View job in ML',
          }
        )}
      </MLJobLink>
    ),
  },
];

interface Props {
  status: FETCH_STATUS;
  onAddEnvironments: () => void;
  jobs: Jobs;
  hasLegacyJobs: boolean;
}
export const JobsList = ({
  status,
  onAddEnvironments,
  jobs,
  hasLegacyJobs,
}: Props) => {
  const isLoading =
    status === FETCH_STATUS.PENDING || status === FETCH_STATUS.LOADING;

  const hasFetchFailure = status === FETCH_STATUS.FAILURE;

  return (
    <EuiPanel>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle>
            <h2>
              {i18n.translate(
                'xpack.apm.settings.anomalyDetection.jobList.environments',
                {
                  defaultMessage: 'Environments',
                }
              )}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={onAddEnvironments}>
            {i18n.translate(
              'xpack.apm.settings.anomalyDetection.jobList.addEnvironments',
              {
                defaultMessage: 'Create ML Job',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <EuiText>
        <FormattedMessage
          id="xpack.apm.settings.anomalyDetection.jobList.mlDescriptionText"
          defaultMessage="To add anomaly detection to a new environment, create a machine learning job. Existing machine learning jobs can be managed in {mlJobsLink}."
          values={{
            mlJobsLink: (
              <MLLink path="jobs">
                {i18n.translate(
                  'xpack.apm.settings.anomalyDetection.jobList.mlDescriptionText.mlJobsLinkText',
                  {
                    defaultMessage: 'Machine Learning',
                  }
                )}
              </MLLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer size="l" />
      <ManagedTable
        noItemsMessage={
          isLoading ? (
            <LoadingStatePrompt />
          ) : hasFetchFailure ? (
            <FailureStatePrompt />
          ) : (
            <EmptyStatePrompt />
          )
        }
        columns={columns}
        items={jobs}
      />
      <EuiSpacer size="l" />

      {hasLegacyJobs && <LegacyJobsCallout />}
    </EuiPanel>
  );
};

function EmptyStatePrompt() {
  return (
    <>
      {i18n.translate(
        'xpack.apm.settings.anomalyDetection.jobList.emptyListText',
        {
          defaultMessage: 'No anomaly detection jobs.',
        }
      )}
    </>
  );
}

function FailureStatePrompt() {
  return (
    <>
      {i18n.translate(
        'xpack.apm.settings.anomalyDetection.jobList.failedFetchText',
        {
          defaultMessage: 'Unabled to fetch anomaly detection jobs.',
        }
      )}
    </>
  );
}
