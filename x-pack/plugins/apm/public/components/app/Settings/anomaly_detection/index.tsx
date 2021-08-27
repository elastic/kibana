/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiEmptyPrompt, EuiPanel } from '@elastic/eui';
import React, { useState } from 'react';
import { ML_ERRORS } from '../../../../../common/anomaly_detection';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useLicenseContext } from '../../../../context/license/use_license_context';
import { useFetcher } from '../../../../hooks/use_fetcher';
import type { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { LicensePrompt } from '../../../shared/license_prompt';
import { AddEnvironments } from './add_environments';
import { JobsList } from './jobs_list';

export type AnomalyDetectionApiResponse = APIReturnType<'GET /api/apm/settings/anomaly-detection/jobs'>;

const DEFAULT_VALUE: AnomalyDetectionApiResponse = {
  jobs: [],
  hasLegacyJobs: false,
};

export function AnomalyDetection() {
  const plugin = useApmPluginContext();
  const canGetJobs = !!plugin.core.application.capabilities.ml?.canGetJobs;
  const license = useLicenseContext();
  const hasValidLicense = license?.isActive && license?.hasAtLeast('platinum');

  const [viewAddEnvironments, setViewAddEnvironments] = useState(false);

  const { refetch, data = DEFAULT_VALUE, status } = useFetcher(
    (callApmApi) => {
      if (canGetJobs) {
        return callApmApi({
          endpoint: `GET /api/apm/settings/anomaly-detection/jobs`,
        });
      }
    },
    [canGetJobs],
    { preservePreviousData: false, showToastOnError: false }
  );

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
          currentEnvironments={data.jobs.map(({ environment }) => environment)}
          onCreateJobSuccess={() => {
            refetch();
            setViewAddEnvironments(false);
          }}
          onCancel={() => {
            setViewAddEnvironments(false);
          }}
        />
      ) : (
        <JobsList
          data={data}
          status={status}
          onAddEnvironments={() => {
            setViewAddEnvironments(true);
          }}
        />
      )}
    </>
  );
}
