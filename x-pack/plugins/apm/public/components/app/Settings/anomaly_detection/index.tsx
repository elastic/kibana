/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiTitle, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiPanel, EuiEmptyPrompt } from '@elastic/eui';
import { ML_ERRORS } from '../../../../../common/anomaly_detection';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { JobsList } from './jobs_list';
import { AddEnvironments } from './add_environments';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { LicensePrompt } from '../../../shared/LicensePrompt';
import { useLicenseContext } from '../../../../context/license/use_license_context';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';

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
      <EuiPanel>
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
      <EuiTitle size="l">
        <h1>
          {i18n.translate('xpack.apm.settings.anomalyDetection.titleText', {
            defaultMessage: 'Anomaly detection',
          })}
        </h1>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText color="subdued">
        {i18n.translate('xpack.apm.settings.anomalyDetection.descriptionText', {
          defaultMessage: `Machine Learning's anomaly detection integration enables application health status indicators for services in each configured environment by identifying anomalies in latency.`,
        })}
      </EuiText>
      <EuiSpacer size="l" />
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
