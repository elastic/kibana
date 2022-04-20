/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import { useSyntheticsServiceAllowed } from '../../components/monitor_management/hooks/use_service_allowed';

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
        body={<p>{PUBLIC_BETA_DESCRIPTION}</p>}
        actions={[
          <EuiButton color="primary" fill isDisabled={!signupUrl} href={signupUrl ?? undefined}>
            {REQUEST_ACCESS_LABEL}
          </EuiButton>,
        ]}
      />
    );
  }

  return <>{children}</>;
};

const REQUEST_ACCESS_LABEL = i18n.translate('xpack.uptime.monitorManagement.requestAccess', {
  defaultMessage: 'Request access',
});

export const MONITOR_MANAGEMENT_LABEL = i18n.translate('xpack.uptime.monitorManagement.label', {
  defaultMessage: 'Monitor Management',
});

const LOADING_MONITOR_MANAGEMENT_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.loading.label',
  {
    defaultMessage: 'Loading Monitor Management',
  }
);

export const PUBLIC_BETA_DESCRIPTION = i18n.translate(
  'xpack.uptime.monitorManagement.publicBetaDescription',
  {
    defaultMessage:
      "We've got a brand new app on the way. In the meantime, we're excited to give you early access to our globally managed testing infrastructure. This will allow you to upload synthetic monitors using our new point and click script recorder and manage your monitors with a new UI.",
  }
);
