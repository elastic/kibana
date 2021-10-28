/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { getEnvironmentLabel } from '../../../../../common/environment_filter_values';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { MLExplorerLink } from '../../../shared/Links/MachineLearningLinks/MLExplorerLink';
import { MLManageJobsLink } from '../../../shared/Links/MachineLearningLinks/MLManageJobsLink';
import { LoadingStatePrompt } from '../../../shared/LoadingStatePrompt';
import { ITableColumn, ManagedTable } from '../../../shared/managed_table';
import { AnomalyDetectionApiResponse } from './index';
import { LegacyJobsCallout } from './legacy_jobs_callout';
import { MLJobsAwaitingNodeWarning } from '../../../../../../ml/public';

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
    align: RIGHT_ALIGNMENT,
    name: i18n.translate(
      'xpack.apm.settings.anomalyDetection.jobList.actionColumnLabel',
      { defaultMessage: 'Action' }
    ),
    render: (_, { job_id: jobId }) => (
      <MLExplorerLink jobId={jobId}>
        {i18n.translate(
          'xpack.apm.settings.anomalyDetection.jobList.mlJobLinkText',
          {
            defaultMessage: 'View job in ML',
          }
        )}
      </MLExplorerLink>
    ),
  },
];

interface Props {
  data: AnomalyDetectionApiResponse;
  status: FETCH_STATUS;
  onAddEnvironments: () => void;
}
export function JobsList({ data, status, onAddEnvironments }: Props) {
  const { jobs, hasLegacyJobs } = data;

  return (
    <>
      <MLJobsAwaitingNodeWarning jobIds={jobs.map((j) => j.job_id)} />
      <EuiText color="subdued">
        <FormattedMessage
          id="xpack.apm.settings.anomalyDetection.jobList.mlDescriptionText"
          defaultMessage="To add anomaly detection to a new environment, create a machine learning job. Existing machine learning jobs can be managed in {mlJobsLink}."
          values={{
            mlJobsLink: (
              <MLManageJobsLink>
                {i18n.translate(
                  'xpack.apm.settings.anomalyDetection.jobList.mlDescriptionText.mlJobsLinkText',
                  {
                    defaultMessage: 'Machine Learning',
                  }
                )}
              </MLManageJobsLink>
            ),
          }}
        />
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="s">
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
          <EuiButton fill iconType="plusInCircle" onClick={onAddEnvironments}>
            {i18n.translate(
              'xpack.apm.settings.anomalyDetection.jobList.addEnvironments',
              {
                defaultMessage: 'Create ML Job',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <ManagedTable
        noItemsMessage={getNoItemsMessage({ status })}
        columns={columns}
        items={jobs}
      />
      <EuiSpacer size="l" />

      {hasLegacyJobs && <LegacyJobsCallout />}
    </>
  );
}

function getNoItemsMessage({ status }: { status: FETCH_STATUS }) {
  // loading state
  const isLoading = status === FETCH_STATUS.LOADING;
  if (isLoading) {
    return <LoadingStatePrompt />;
  }

  // An unexpected error occurred. Show default error message
  if (status === FETCH_STATUS.FAILURE) {
    return i18n.translate(
      'xpack.apm.settings.anomalyDetection.jobList.failedFetchText',
      { defaultMessage: 'Unable to fetch anomaly detection jobs.' }
    );
  }

  // no errors occurred
  return i18n.translate(
    'xpack.apm.settings.anomalyDetection.jobList.emptyListText',
    { defaultMessage: 'No anomaly detection jobs.' }
  );
}
