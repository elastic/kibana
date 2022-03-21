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
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useMlManageJobsHref } from '../../../../hooks/use_ml_manage_jobs_href';
import { callApmApi } from '../../../../services/rest/create_call_apm_api';
import { MLExplorerLink } from '../../../shared/links/machine_learning_links/mlexplorer_link';
import { MLManageJobsLink } from '../../../shared/links/machine_learning_links/mlmanage_jobs_link';
import { LoadingStatePrompt } from '../../../shared/loading_state_prompt';
import type { ITableColumn } from '../../../shared/managed_table';
import { ManagedTableSyncUrl } from '../../../shared/managed_table/managed_table_sync_url';
import { MLCallout, shouldDisplayMlCallout } from '../../../shared/ml_callout';
import { AnomalyDetectionApiResponse } from './index';
import { JobsListStatus } from './jobs_list_status';

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
                'xpack.apm.settings.anomalyDetection.jobList.openAnomalyExplorerrLinkText',
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
  const { core } = useApmPluginContext();

  const { jobs } = data;

  // default to showing legacy jobs if not up to date
  const [showLegacyJobs, setShowLegacyJobs] = useState(
    setupState !== AnomalyDetectionSetupState.UpToDate
  );

  const mlManageJobsHref = useMlManageJobsHref();

  const displayMlCallout = shouldDisplayMlCallout(setupState);

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
      {displayMlCallout && (
        <>
          <MLCallout
            isOnSettingsPage
            onCreateJobClick={() => {
              onAddEnvironments();
            }}
            onUpgradeClick={() => {
              if (setupState === AnomalyDetectionSetupState.UpgradeableJobs) {
                return callApmApi(
                  'POST /internal/apm/settings/anomaly-detection/update_to_v3',
                  {
                    signal: null,
                  }
                ).then(() => {
                  core.notifications.toasts.addSuccess({
                    title: i18n.translate(
                      'xpack.apm.jobsList.updateCompletedToastTitle',
                      {
                        defaultMessage: 'Anomaly detection jobs created!',
                      }
                    ),
                    text: i18n.translate(
                      'xpack.apm.jobsList.updateCompletedToastText',
                      {
                        defaultMessage:
                          'Your new anomaly detection jobs have been created successfully. You will start to see anomaly detection results in the app within minutes. The old jobs have been closed but the results are still available within Machine Learning.',
                      }
                    ),
                  });
                  onUpdateComplete();
                });
              }
            }}
            anomalyDetectionSetupState={setupState}
          />
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
                defaultMessage: 'Manage jobs',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill iconType="plusInCircle" onClick={onAddEnvironments}>
            {i18n.translate(
              'xpack.apm.settings.anomalyDetection.jobList.addEnvironments',
              {
                defaultMessage: 'Create job',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <ManagedTableSyncUrl
        noItemsMessage={getNoItemsMessage({ status })}
        columns={columns}
        items={filteredJobs}
        tableLayout="auto"
      />
      <EuiSpacer size="l" />
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
