/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import { useSyntheticsServiceAllowed } from '../../../hooks/use_service_allowed';

export const ServiceAllowedWrapper: React.FC = ({ children }) => {
  const { isAllowed, signupUrl, loading } = useSyntheticsServiceAllowed();

  if (loading) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingLogo logo="logoKibana" size="xl" />}
        title={<h2>{LOADING_MONITOR_MANAGEMENT_LABEL}</h2>}
      />
    );
  }

  // checking for explicit false
  if (isAllowed === false) {
    return (
      <EuiEmptyPrompt
        title={<h2>{MONITOR_MANAGEMENT_LABEL}</h2>}
        body={<p>{ACCESS_RESTRICTED_MESSAGE}</p>}
        actions={[
          <EuiButton
            data-test-subj="syntheticsServiceAllowedWrapperButton"
            color="primary"
            fill
            isDisabled={!signupUrl}
            href={signupUrl ?? undefined}
          >
            {REQUEST_ACCESS_LABEL}
          </EuiButton>,
        ]}
      />
    );
  }

  return <>{children}</>;
};

const REQUEST_ACCESS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.requestAccess', {
  defaultMessage: 'Request access',
});

export const MONITOR_MANAGEMENT_LABEL = i18n.translate('xpack.synthetics.monitorManagement.label', {
  defaultMessage: 'Synthetics App',
});

const LOADING_MONITOR_MANAGEMENT_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.loading.label',
  {
    defaultMessage: 'Loading Synthetics App',
  }
);

export const ACCESS_RESTRICTED_MESSAGE = i18n.translate(
  'xpack.synthetics.monitorManagement.accessRestricted',
  {
    defaultMessage: 'Your access to globally managed testing infrastructure is restricted.',
  }
);
