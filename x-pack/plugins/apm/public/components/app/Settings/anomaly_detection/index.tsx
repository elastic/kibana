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
import { useFetcher, FETCH_STATUS } from '../../../../hooks/useFetcher';
import { LicensePrompt } from '../../../shared/LicensePrompt';
import { useLicense } from '../../../../hooks/useLicense';

export const AnomalyDetection = () => {
  const license = useLicense();
  const hasValidLicense = license?.isActive && license?.hasAtLeast('platinum');

  const [viewAddEnvironments, setViewAddEnvironments] = useState(false);

  const { refetch, data = [], status } = useFetcher(
    (callApmApi) =>
      callApmApi({ pathname: `/api/apm/settings/anomaly-detection` }),
    [],
    { preservePreviousData: false }
  );

  const isLoading =
    status === FETCH_STATUS.PENDING || status === FETCH_STATUS.LOADING;
  const hasFetchFailure = status === FETCH_STATUS.FAILURE;

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
            'The Machine Learning anomaly detection integration enables application health status indicators in the Service map by identifying transaction duration anomalies.',
        })}
      </EuiText>
      <EuiSpacer size="l" />
      {viewAddEnvironments ? (
        <AddEnvironments
          currentEnvironments={data.map(({ environment }) => environment)}
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
          isLoading={isLoading}
          hasFetchFailure={hasFetchFailure}
          anomalyDetectionJobsByEnv={data}
          onAddEnvironments={() => {
            setViewAddEnvironments(true);
          }}
        />
      )}
    </>
  );
};
