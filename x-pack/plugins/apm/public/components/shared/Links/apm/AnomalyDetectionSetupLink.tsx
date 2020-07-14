/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiButtonEmpty, EuiToolTip, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { APMLink } from './APMLink';
import { getEnvironmentLabel } from '../../../../../common/environment_filter_values';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useFetcher, FETCH_STATUS } from '../../../../hooks/useFetcher';

export function AnomalyDetectionSetupLink() {
  const { uiFilters } = useUrlParams();
  const environment = uiFilters.environment;

  const { data = { jobs: [], hasLegacyJobs: false }, status } = useFetcher(
    (callApmApi) =>
      callApmApi({ pathname: `/api/apm/settings/anomaly-detection` }),
    [],
    { preservePreviousData: false }
  );
  const isFetchSuccess = status === FETCH_STATUS.SUCCESS;

  return (
    <APMLink path="/settings/anomaly-detection">
      <EuiButtonEmpty size="s" color="primary" iconType="inspect">
        {ANOMALY_DETECTION_LINK_LABEL}
      </EuiButtonEmpty>
      {isFetchSuccess && showAlert(data.jobs, environment) && (
        <EuiToolTip position="bottom" content={getTooltipText(environment)}>
          <EuiIcon type="alert" color="danger" />
        </EuiToolTip>
      )}
    </APMLink>
  );
}

function getTooltipText(environment?: string) {
  if (!environment) {
    return i18n.translate('xpack.apm.anomalyDetectionSetup.notEnabledText', {
      defaultMessage: `Anomaly detection is not yet enabled. Click to continue setup.`,
    });
  }

  return i18n.translate(
    'xpack.apm.anomalyDetectionSetup.notEnabledForEnvironmentText',
    {
      defaultMessage: `Anomaly detection is not yet enabled for the "{currentEnvironment}" environment. Click to continue setup.`,
      values: { currentEnvironment: getEnvironmentLabel(environment) },
    }
  );
}

const ANOMALY_DETECTION_LINK_LABEL = i18n.translate(
  'xpack.apm.anomalyDetectionSetup.linkLabel',
  { defaultMessage: `Anomaly detection` }
);

export function showAlert(
  jobs: Array<{ environment: string }> = [],
  environment: string | undefined
) {
  return (
    // No job exists, or
    jobs.length === 0 ||
    // no job exists for the selected environment
    (environment !== undefined &&
      jobs.every((job) => environment !== job.environment))
  );
}
