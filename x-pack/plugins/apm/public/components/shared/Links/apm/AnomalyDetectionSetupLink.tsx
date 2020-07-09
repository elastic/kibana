/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiButtonEmpty, EuiToolTip, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { APMLink } from './APMLink';
import { ENVIRONMENT_NOT_DEFINED } from '../../../../../common/environment_filter_values';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useFetcher, FETCH_STATUS } from '../../../../hooks/useFetcher';

export function AnomalyDetectionSetupLink() {
  const { uiFilters, urlParams } = useUrlParams();
  // check both uiFilters and urlParams for selected environment
  const environment = uiFilters.environment || urlParams.environment;

  const { data = [], status } = useFetcher(
    (callApmApi) =>
      callApmApi({ pathname: `/api/apm/settings/anomaly-detection` }),
    [],
    { preservePreviousData: false }
  );
  const isFetchSuccess = status === FETCH_STATUS.SUCCESS;

  const hasJobs = data.length > 0;
  const hasJobForEnv = environment
    ? data.some(({ environment: env }) => environment === env)
    : true;

  const showAlert = isFetchSuccess && (!hasJobs || !hasJobForEnv);
  const toolTipText = environment
    ? getNotEnabledForEnvironmentText(environment)
    : NOT_ENABLED_TEXT;

  return (
    <APMLink path="/settings/anomaly-detection">
      <EuiButtonEmpty size="s" color="primary" iconType="inspect">
        {ANOMALY_DETECTION_LINK_LABEL}
      </EuiButtonEmpty>
      {showAlert && (
        <EuiToolTip position="bottom" content={toolTipText}>
          <EuiIcon type="alert" color="danger" />
        </EuiToolTip>
      )}
    </APMLink>
  );
}

function getEnvironmentLabel(environment: string) {
  if (environment === ENVIRONMENT_NOT_DEFINED) {
    return i18n.translate('xpack.apm.filter.environment.notDefinedLabel', {
      defaultMessage: 'Not defined',
    });
  }
  return environment;
}

function getNotEnabledForEnvironmentText(environment: string) {
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
const NOT_ENABLED_TEXT = i18n.translate(
  'xpack.apm.anomalyDetectionSetup.notEnabledText',
  {
    defaultMessage: `Anomaly detection is not yet enabled. Click to continue setup.`,
  }
);
