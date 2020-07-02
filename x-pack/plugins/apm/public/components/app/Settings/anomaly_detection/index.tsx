/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { JobsList } from './jobs_list';
import { AddEnvironments } from './add_environments';
import { useFetcher, FETCH_STATUS } from '../../../../hooks/useFetcher';

export const AnomalyDetection = () => {
  const [viewAddEnvironments, setViewAddEnvironments] = useState(false);

  const { refetch, data = [], status } = useFetcher(
    (callApmApi) =>
      callApmApi({ pathname: `/api/apm/settings/anomaly-detection` }),
    [],
    { preservePreviousData: false }
  );

  const isLoading =
    status === FETCH_STATUS.PENDING || status === FETCH_STATUS.LOADING;

  // if (status === FETCH_STATUS.FAILURE) {
  //   return failurePrompt;
  // }

  // if (status === FETCH_STATUS.SUCCESS && isEmpty(data)) {
  //   return emptyStatePrompt;
  // }

  return (
    <>
      <EuiTitle size="l">
        <h1>
          {i18n.translate('xpack.apm.settings.anomalyDetection', {
            defaultMessage: 'Anomaly detection',
          })}
        </h1>
      </EuiTitle>
      <EuiSpacer size="l" />
      The Machine Learning integration enables you to see the health status of your applications in the Service map and identifies anomalies in your transaction duration to show unexpected increase in response time.
      <EuiSpacer size="l" />
      {viewAddEnvironments ? (
        <AddEnvironments
          currentEnvironments={data.map(
            ({ 'service.environment': environment }) => environment
          )}
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
          anomalyDetectionJobsByEnv={data}
          onAddEnvironments={() => {
            setViewAddEnvironments(true);
          }}
        />
      )}
    </>
  );
};
