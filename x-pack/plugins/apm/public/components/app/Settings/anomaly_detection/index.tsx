/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiTitle, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiPanel } from '@elastic/eui';
import { JobsList } from './jobs_list';
import { AddEnvironments } from './add_environments';
import { useFetcher } from '../../../../hooks/useFetcher';
import { LicensePrompt } from '../../../shared/LicensePrompt';
import { useLicense } from '../../../../hooks/useLicense';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';

export type AnomalyDetectionApiResponse = APIReturnType<
  '/api/apm/settings/anomaly-detection'
>;

const DEFAULT_VALUE: AnomalyDetectionApiResponse = {
  jobs: [],
  hasLegacyJobs: false,
};

export const AnomalyDetection = () => {
  const license = useLicense();
  const hasValidLicense = license?.isActive && license?.hasAtLeast('platinum');

  const [viewAddEnvironments, setViewAddEnvironments] = useState(false);

  const { refetch, data = DEFAULT_VALUE, status } = useFetcher(
    (callApmApi) =>
      callApmApi({ pathname: `/api/apm/settings/anomaly-detection` }),
    [],
    { preservePreviousData: false, showToastOnError: false }
  );

  if (!hasValidLicense) {
    return (
      <EuiPanel>
        <LicensePrompt
          text={i18n.translate(
            'xpack.apm.settings.anomaly_detection.license.text',
            {
              defaultMessage:
                "To use anomaly detection, you must be subscribed to an Elastic Platinum license. With it, you'll have the ability monitor your services with the aid of machine learning.",
            }
          )}
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
          defaultMessage:
            'The Machine Learning anomaly detection integration enables application health status indicators for each configured environment in the Service map by identifying transaction duration anomalies.',
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
          status={status}
          jobs={data.jobs}
          hasLegacyJobs={data.hasLegacyJobs}
          onAddEnvironments={() => {
            setViewAddEnvironments(true);
          }}
        />
      )}
    </>
  );
};
