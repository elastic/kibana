/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiCodeBlock, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useState } from 'react';
import {
  IntegrationInstallationError,
  useInstallIntegrations,
} from '../../../hooks/use_install_integrations';

export function MultiIntegrationInstallBanner() {
  const [error, setError] = useState<IntegrationInstallationError>();

  const onIntegrationCreationFailure = useCallback((e: IntegrationInstallationError) => {
    setError(e);
  }, []);

  const { performRequest, requestState } = useInstallIntegrations({
    onIntegrationCreationFailure,
    packages: ['system', 'kubernetes'],
  });

  useEffect(() => {
    performRequest();
  }, [performRequest]);

  const hasFailedInstallingIntegration = requestState.state === 'rejected';

  if (hasFailedInstallingIntegration) {
    return (
      <EuiFlexItem>
        <EuiCallOut
          title={i18n.translate('xpack.observability_onboarding.otelLogs.status.failed', {
            defaultMessage: 'Integration installation failed',
          })}
          color="warning"
          iconType="warning"
          data-test-subj="obltOnboardingOtelLogsIntegrationInstallationFailed"
        >
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              {i18n.translate('xpack.observability_onboarding.otelLogs.status.failedDetails', {
                defaultMessage: 'Incoming data might not be indexed correctly. Details:',
              })}
            </EuiFlexItem>
            <EuiCodeBlock>{error?.message}</EuiCodeBlock>
          </EuiFlexGroup>
        </EuiCallOut>
      </EuiFlexItem>
    );
  }
  return null;
}
