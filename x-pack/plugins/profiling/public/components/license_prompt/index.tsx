/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import url from 'url';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';

const KIBANA_LICENSE_MANAGEMENT_URL = '/app/management/stack/license_management';

export function LicensePrompt() {
  const { core } = useProfilingDependencies().start;
  const manageLicenseURL = url.format({
    pathname: core.http.basePath.prepend(KIBANA_LICENSE_MANAGEMENT_URL),
  });

  return (
    <EuiEmptyPrompt
      iconType="logoObservability"
      iconColor="warning"
      title={
        <h1>
          {i18n.translate('xpack.profiling.invalidLicense.message', {
            defaultMessage: 'To access Universal Profiling, upgrade to an Enterprise subscription',
          })}
        </h1>
      }
      body={
        <p>
          {i18n.translate('xpack.profiling.invalidLicense.description', {
            defaultMessage:
              'You must have an Enterprise subscription to use Universal Profiling features.',
          })}
        </p>
      }
      actions={[
        <EuiButton
          data-test-subj="profilingLicensePromptUpgradeSubscriptionButton"
          href={manageLicenseURL}
          fill
        >
          {i18n.translate('xpack.profiling.invalidLicense.subscriptionManagementLink', {
            defaultMessage: 'Upgrade subscription',
          })}
        </EuiButton>,
      ]}
    />
  );
}
