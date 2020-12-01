/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiTitle, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiPanel, EuiEmptyPrompt } from '@elastic/eui';
import { ML_ERRORS } from '../../../../../common/anomaly_detection';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';
import { JobsList } from './jobs_list';
import { AddEnvironments } from './add_environments';
import { useFetcher } from '../../../../hooks/useFetcher';
import { LicensePrompt } from '../../../shared/LicensePrompt';
import { useLicense } from '../../../../hooks/useLicense';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';

export type AnomalyDetectionApiResponse = APIReturnType<'GET /api/apm/settings/anomaly-detection'>;

const DEFAULT_VALUE: AnomalyDetectionApiResponse = {
  jobs: [],
  hasLegacyJobs: false,
};

export function AnomalyDetection() {
  const plugin = useApmPluginContext();
  const canGetJobs = !!plugin.core.application.capabilities.ml?.canGetJobs;
  const license = useLicense();
  const hasValidLicense = license?.isActive && license?.hasAtLeast('platinum');

  const [viewAddEnvironments, setViewAddEnvironments] = useState(false);

  const { refetch, data = DEFAULT_VALUE, status } = useFetcher(
    (callApmApi) => {
      if (canGetJobs) {
        return callApmApi({
          endpoint: `GET /api/apm/settings/anomaly-detection`,
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
      <EuiSpacer size="l" />
      <EuiText>
        {i18n.translate('xpack.apm.settings.anomalyDetection.descriptionText', {
          defaultMessage: `Machine Learning's anomaly detection integration enables application health status indicators for services in each configured environment by identifying transaction duration anomalies.`,
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
