/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiButtonEmpty, EuiToolTip, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { APMLink } from './APMLink';
import {
  ENVIRONMENT_ALL,
  getEnvironmentLabel,
} from '../../../../../common/environment_filter_values';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useFetcher, FETCH_STATUS } from '../../../../hooks/useFetcher';
import { useLicense } from '../../../../hooks/useLicense';

export type AnomalyDetectionApiResponse = APIReturnType<
  '/api/apm/settings/anomaly-detection',
  'GET'
>;

const DEFAULT_DATA = { jobs: [], hasLegacyJobs: false };

export function AnomalyDetectionSetupLink() {
  const { uiFilters } = useUrlParams();
  const environment = uiFilters.environment;
  const plugin = useApmPluginContext();
  const canGetJobs = !!plugin.core.application.capabilities.ml?.canGetJobs;
  const license = useLicense();
  const hasValidLicense = license?.isActive && license?.hasAtLeast('platinum');

  return (
    <APMLink
      path="/settings/anomaly-detection"
      style={{ whiteSpace: 'nowrap' }}
    >
      <EuiButtonEmpty size="s" color="primary" iconType="inspect">
        {ANOMALY_DETECTION_LINK_LABEL}
      </EuiButtonEmpty>

      {canGetJobs && hasValidLicense ? (
        <MissingJobsAlert environment={environment} />
      ) : null}
    </APMLink>
  );
}

export function MissingJobsAlert({ environment }: { environment?: string }) {
  const { data = DEFAULT_DATA, status } = useFetcher(
    (callApmApi) =>
      callApmApi({ pathname: `/api/apm/settings/anomaly-detection` }),
    [],
    { preservePreviousData: false, showToastOnError: false }
  );

  if (status !== FETCH_STATUS.SUCCESS) {
    return null;
  }

  const isEnvironmentSelected =
    environment && environment !== ENVIRONMENT_ALL.value;

  // there are jobs for at least one environment
  if (!isEnvironmentSelected && data.jobs.length > 0) {
    return null;
  }

  // there are jobs for the selected environment
  if (
    isEnvironmentSelected &&
    data.jobs.some((job) => environment === job.environment)
  ) {
    return null;
  }

  return (
    <EuiToolTip position="bottom" content={getTooltipText(environment)}>
      <EuiIcon type="alert" color="danger" />
    </EuiToolTip>
  );
}

function getTooltipText(environment?: string) {
  if (!environment || environment === ENVIRONMENT_ALL.value) {
    return i18n.translate('xpack.apm.anomalyDetectionSetup.notEnabledText', {
      defaultMessage: `Anomaly detection is not yet enabled. Click to continue setup.`,
    });
  }

  return i18n.translate(
    'xpack.apm.anomalyDetectionSetup.notEnabledForEnvironmentText',
    {
      defaultMessage: `Anomaly detection is not yet enabled for the environment "{currentEnvironment}". Click to continue setup.`,
      values: { currentEnvironment: getEnvironmentLabel(environment) },
    }
  );
}

const ANOMALY_DETECTION_LINK_LABEL = i18n.translate(
  'xpack.apm.anomalyDetectionSetup.linkLabel',
  { defaultMessage: `Anomaly detection` }
);
