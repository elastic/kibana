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
import { AnomalyDetectionJobByEnv } from '../../../../../typings/anomaly_detection';
import { MLJobLink } from '../../../shared/Links/MachineLearningLinks/MLJobLink';
import { MLLink } from '../../../shared/Links/MachineLearningLinks/MLLink';
import { ENVIRONMENT_NOT_DEFINED } from '../../../../../common/environment_filter_values';
import { LegacyJobsCallout } from './legacy_jobs_callout';

const columns: Array<ITableColumn<AnomalyDetectionJobByEnv>> = [
  {
    field: 'environment',
    name: i18n.translate(
      'xpack.apm.settings.anomalyDetection.jobList.environmentColumnLabel',
      { defaultMessage: 'Environment' }
    ),
    render: (environment: string) => {
      if (environment === ENVIRONMENT_NOT_DEFINED) {
        return i18n.translate('xpack.apm.filter.environment.notDefinedLabel', {
          defaultMessage: 'Not defined',
        });
      }
      return environment;
    },
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
  anomalyDetectionJobsByEnv: AnomalyDetectionJobByEnv[];
  hasLegacyJobs: boolean;
}
export const JobsList = ({
  status,
  onAddEnvironments,
  anomalyDetectionJobsByEnv,
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
                defaultMessage: 'Add environments',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <EuiText>
        <FormattedMessage
          id="xpack.apm.settings.anomalyDetection.jobList.mlDescriptionText"
          defaultMessage="Manage existing anomaly detection jobs in {mlJobsLink}."
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
        items={isLoading || hasFetchFailure ? [] : anomalyDetectionJobsByEnv}
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
