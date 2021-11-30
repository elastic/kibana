/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSwitch } from '@elastic/eui';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { MLJobsAwaitingNodeWarning } from '../../../../../../ml/public';
import { AnomalyDetectionSetupState } from '../../../../../common/anomaly_detection/get_anomaly_detection_setup_state';
import { getEnvironmentLabel } from '../../../../../common/environment_filter_values';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useMlManageJobsHref } from '../../../../hooks/use_ml_manage_jobs_href';
import { MLExplorerLink } from '../../../shared/Links/MachineLearningLinks/MLExplorerLink';
import { MLManageJobsLink } from '../../../shared/Links/MachineLearningLinks/MLManageJobsLink';
import { LoadingStatePrompt } from '../../../shared/LoadingStatePrompt';
import { ITableColumn, ManagedTable } from '../../../shared/managed_table';
import { AnomalyDetectionApiResponse } from './index';
import { JobsListStatus } from './jobs_list_status';
import { LegacyJobsCallout } from './legacy_jobs_callout';
import { UpdateJobsCallout } from './update_jobs_callout';

type Jobs = AnomalyDetectionApiResponse['jobs'];

const columns: Array<ITableColumn<Jobs[0]>> = [
  {
    field: 'environment',
    name: i18n.translate(
      'xpack.apm.settings.anomalyDetection.jobList.environmentColumnLabel',
      { defaultMessage: 'Environment' }
    ),
    width: '100%',
    render: (_, { environment, jobId, jobState, datafeedState, version }) => {
      return (
        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem grow={false}>
            {getEnvironmentLabel(environment)}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <JobsListStatus
              jobId={jobId}
              version={version}
              jobState={jobState}
              datafeedState={datafeedState}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
  },
  {
    field: 'job_id',
    align: RIGHT_ALIGNMENT,
    name: i18n.translate(
      'xpack.apm.settings.anomalyDetection.jobList.actionColumnLabel',
      { defaultMessage: 'Action' }
    ),
    render: (_, { jobId }) => {
      return (
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate(
                'xpack.apm.settings.anomalyDetection.jobList.mlJobLinkText',
                {
                  defaultMessage: 'Manage job',
                }
              )}
            >
              {/* setting the key to remount the element as a workaround for https://github.com/elastic/kibana/issues/119951*/}
              <MLManageJobsLink jobId={jobId} key={jobId}>
                <EuiIcon type="gear" />
              </MLManageJobsLink>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate(
                'xpack.apm.settings.anomalyDetection.jobList.mlJobLinkText',
                {
                  defaultMessage: 'Open in Anomaly Explorer',
                }
              )}
            >
              <MLExplorerLink jobId={jobId}>
                <EuiIcon type="visTable" />
              </MLExplorerLink>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
  },
];

interface Props {
  data: AnomalyDetectionApiResponse;
  setupState: AnomalyDetectionSetupState;
  status: FETCH_STATUS;
  onAddEnvironments: () => void;
  onUpdateComplete: () => void;
}

export function JobsList({
  data,
  status,
  onAddEnvironments,
  setupState,
  onUpdateComplete,
}: Props) {
  const { jobs, hasLegacyJobs } = data;

  const [showLegacyJobs, setShowLegacyJobs] = useState(false);

  const mlManageJobsHref = useMlManageJobsHref();

  const filteredJobs = showLegacyJobs
    ? jobs
    : jobs.filter((job) => job.version >= 3);

  return (
    <>
      <MLJobsAwaitingNodeWarning jobIds={filteredJobs.map((j) => j.jobId)} />
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

      {setupState === AnomalyDetectionSetupState.UpgradeableJobs && (
        <>
          <UpdateJobsCallout onUpdateComplete={onUpdateComplete} />
          <EuiSpacer size="m" />
        </>
      )}

      <EuiFlexGroup alignItems="center">
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
          <EuiSwitch
            checked={showLegacyJobs}
            onChange={(e) => {
              setShowLegacyJobs(e.target.checked);
            }}
            label={i18n.translate(
              'xpack.apm.settings.anomalyDetection.jobList.showLegacyJobsCheckboxText',
              {
                defaultMessage: 'Show legacy jobs',
              }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton href={mlManageJobsHref} color="primary">
            {i18n.translate(
              'xpack.apm.settings.anomalyDetection.jobList.manageMlJobsButtonText',
              {
                defaultMessage: 'Manage ML Jobs',
              }
            )}
          </EuiButton>
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
        items={filteredJobs}
        tableLayout="auto"
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
