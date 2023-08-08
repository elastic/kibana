/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useSystemIntegrationStatus } from '../../../hooks/use_system_integration_status';

export function SystemIntegrationBanner() {
  const { status: systemIntegrationStatus, data: systemIntegrationData } =
    useSystemIntegrationStatus();

  if (systemIntegrationStatus === 'loading') {
    return (
      <EuiCallOut
        title={
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              {i18n.translate(
                'xpack.observability_onboarding.systemIntegration.checking',
                {
                  defaultMessage: 'Checking System integration',
                }
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        color="primary"
      />
    );
  }
  if (systemIntegrationStatus === 'success') {
    return (
      <EuiFlexItem>
        <EuiCallOut
          title="System integration installed"
          color="success"
          iconType="check"
        >
          {systemIntegrationData?.version}: {systemIntegrationData?.status}
        </EuiCallOut>
      </EuiFlexItem>
    );
  }
  if (systemIntegrationStatus === 'error') {
    return (
      <EuiFlexItem>
        <EuiCallOut
          title="System integration failed"
          color="danger"
          iconType="warning"
        >
          We had a problem checking the system integration status
        </EuiCallOut>
      </EuiFlexItem>
    );
  }
  return null;
}
