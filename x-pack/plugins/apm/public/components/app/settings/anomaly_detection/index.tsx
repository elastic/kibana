/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPanel, EuiEmptyPrompt } from '@elastic/eui';
import { ML_ERRORS } from '../../../../../common/anomaly_detection';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { JobsList } from './jobs_list';
import { AddEnvironments } from './add_environments';
import { LicensePrompt } from '../../../shared/license_prompt';
import { useLicenseContext } from '../../../../context/license/use_license_context';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { useAnomalyDetectionJobsContext } from '../../../../context/anomaly_detection_jobs/use_anomaly_detection_jobs_context';

export type AnomalyDetectionApiResponse =
  APIReturnType<'GET /internal/apm/settings/anomaly-detection/jobs'>;

export function AnomalyDetection() {
  const plugin = useApmPluginContext();
  const canGetJobs = !!plugin.core.application.capabilities.ml?.canGetJobs;
  const license = useLicenseContext();
  const hasValidLicense = license?.isActive && license?.hasAtLeast('platinum');

  const [viewAddEnvironments, setViewAddEnvironments] = useState(false);

  const {
    anomalyDetectionJobsStatus,
    anomalyDetectionJobsRefetch,
    anomalyDetectionJobsData = {
      jobs: [],
      hasLegacyJobs: false,
    } as AnomalyDetectionApiResponse,
    anomalyDetectionSetupState,
  } = useAnomalyDetectionJobsContext();

  if (!hasValidLicense) {
    return (
      <EuiPanel hasBorder={true}>
        <LicensePrompt text={ML_ERRORS.INVALID_LICENSE} />
      </EuiPanel>
    );
  }

  if (!canGetJobs) {
    return (
      <EuiPanel>
        <EuiEmptyPrompt
          iconType="alert"
          body={<>{ML_ERRORS.MISSING_READ_PRIVILEGES}</>}
        />
      </EuiPanel>
    );
  }

  return (
    <>
      {viewAddEnvironments ? (
        <AddEnvironments
          currentEnvironments={anomalyDetectionJobsData.jobs.map(
            ({ environment }) => environment
          )}
          onCreateJobSuccess={() => {
            anomalyDetectionJobsRefetch();
            setViewAddEnvironments(false);
          }}
          onCancel={() => {
            setViewAddEnvironments(false);
          }}
        />
      ) : (
        <JobsList
          data={anomalyDetectionJobsData}
          status={anomalyDetectionJobsStatus}
          setupState={anomalyDetectionSetupState}
          onAddEnvironments={() => {
            setViewAddEnvironments(true);
          }}
          onUpdateComplete={() => {
            anomalyDetectionJobsRefetch();
          }}
        />
      )}
    </>
  );
}
