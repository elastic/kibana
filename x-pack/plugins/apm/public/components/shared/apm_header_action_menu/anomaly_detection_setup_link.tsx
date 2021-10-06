/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
} from '../../../../common/environment_filter_values';
import { useAnomalyDetectionJobsContext } from '../../../context/anomaly_detection_jobs/use_anomaly_detection_jobs_context';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { getAPMHref } from '../Links/apm/APMLink';

export type AnomalyDetectionApiResponse =
  APIReturnType<'GET /api/apm/settings/anomaly-detection/jobs'>;

const DEFAULT_DATA = { jobs: [], hasLegacyJobs: false };

export function AnomalyDetectionSetupLink() {
  const { query } = useApmParams('/*');

  const environment =
    ('environment' in query && query.environment) || ENVIRONMENT_ALL.value;

  const { core } = useApmPluginContext();
  const canGetJobs = !!core.application.capabilities.ml?.canGetJobs;
  const license = useLicenseContext();
  const hasValidLicense = license?.isActive && license?.hasAtLeast('platinum');
  const { basePath } = core.http;
  const theme = useTheme();

  return (
    <EuiHeaderLink
      color="text"
      href={getAPMHref({ basePath, path: '/settings/anomaly-detection' })}
      style={{ whiteSpace: 'nowrap' }}
    >
      {canGetJobs && hasValidLicense ? (
        <MissingJobsAlert environment={environment} />
      ) : (
        <EuiIcon size="s" type="inspect" color="text" />
      )}
      <span style={{ marginInlineStart: theme.eui.euiSizeS }}>
        {ANOMALY_DETECTION_LINK_LABEL}
      </span>
    </EuiHeaderLink>
  );
}

export function MissingJobsAlert({ environment }: { environment?: string }) {
  const {
    anomalyDetectionJobsData = DEFAULT_DATA,
    anomalyDetectionJobsStatus,
  } = useAnomalyDetectionJobsContext();

  const defaultIcon = <EuiIcon size="s" type="inspect" color="text" />;

  if (anomalyDetectionJobsStatus === FETCH_STATUS.LOADING) {
    return <EuiLoadingSpinner />;
  }

  if (anomalyDetectionJobsStatus !== FETCH_STATUS.SUCCESS) {
    return defaultIcon;
  }

  const isEnvironmentSelected =
    environment && environment !== ENVIRONMENT_ALL.value;

  // there are jobs for at least one environment
  if (!isEnvironmentSelected && anomalyDetectionJobsData.jobs.length > 0) {
    return defaultIcon;
  }

  // there are jobs for the selected environment
  if (
    isEnvironmentSelected &&
    anomalyDetectionJobsData.jobs.some((job) => environment === job.environment)
  ) {
    return defaultIcon;
  }

  return (
    <EuiToolTip position="bottom" content={getTooltipText(environment)}>
      <EuiIcon size="s" type="alert" color="danger" />
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
