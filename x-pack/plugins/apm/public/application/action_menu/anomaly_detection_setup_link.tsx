/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiHeaderLink,
  EuiIcon,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  ENVIRONMENT_ALL,
  getEnvironmentLabel,
} from '../../../common/environment_filter_values';
import { getAPMHref } from '../../components/shared/Links/apm/APMLink';
import { useApmPluginContext } from '../../hooks/useApmPluginContext';
import { FETCH_STATUS, useFetcher } from '../../hooks/useFetcher';
import { useLicense } from '../../hooks/useLicense';
import { useUrlParams } from '../../hooks/useUrlParams';
import { APIReturnType } from '../../services/rest/createCallApmApi';
import { units } from '../../style/variables';

export type AnomalyDetectionApiResponse = APIReturnType<
  'GET /api/apm/settings/anomaly-detection'
>;

const DEFAULT_DATA = { jobs: [], hasLegacyJobs: false };

export function AnomalyDetectionSetupLink() {
  const { uiFilters } = useUrlParams();
  const environment = uiFilters.environment;
  const { core } = useApmPluginContext();
  const canGetJobs = !!core.application.capabilities.ml?.canGetJobs;
  const license = useLicense();
  const hasValidLicense = license?.isActive && license?.hasAtLeast('platinum');
  const { basePath } = core.http;

  return (
    <EuiHeaderLink
      color="primary"
      href={getAPMHref({ basePath, path: '/settings/anomaly-detection' })}
      style={{ whiteSpace: 'nowrap' }}
    >
      {canGetJobs && hasValidLicense ? (
        <MissingJobsAlert environment={environment} />
      ) : (
        <EuiIcon type="inspect" color="primary" />
      )}
      <span style={{ marginInlineStart: units.half }}>
        {ANOMALY_DETECTION_LINK_LABEL}
      </span>
    </EuiHeaderLink>
  );
}

export function MissingJobsAlert({ environment }: { environment?: string }) {
  const { data = DEFAULT_DATA, status } = useFetcher(
    (callApmApi) =>
      callApmApi({ endpoint: `GET /api/apm/settings/anomaly-detection` }),
    [],
    { preservePreviousData: false, showToastOnError: false }
  );

  const defaultIcon = <EuiIcon type="inspect" color="primary" />;

  if (status === FETCH_STATUS.LOADING) {
    return <EuiLoadingSpinner />;
  }

  if (status !== FETCH_STATUS.SUCCESS) {
    return defaultIcon;
  }

  const isEnvironmentSelected =
    environment && environment !== ENVIRONMENT_ALL.value;

  // there are jobs for at least one environment
  if (!isEnvironmentSelected && data.jobs.length > 0) {
    return defaultIcon;
  }

  // there are jobs for the selected environment
  if (
    isEnvironmentSelected &&
    data.jobs.some((job) => environment === job.environment)
  ) {
    return defaultIcon;
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
