/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCard, EuiTextColor } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { LicenseManagementLocator } from '@kbn/license-management-plugin/public/locator';

export interface LicensePromptTrialProps {
  text: string;
  licenseManagementLocator?: LicenseManagementLocator;
  ['data-test-subj']?: string;
}

export function LicensePromptTrial({
  text,
  licenseManagementLocator,
  'data-test-subj': dataTestSubj,
}: LicensePromptTrialProps) {
  const { services } = useKibana();

  const licenseManagementUrl = licenseManagementLocator?.useUrl({ page: 'dashboard' });
  const licensePageUrl = services.http?.basePath.prepend(
    '/app/management/stack/license_management'
  );
  const manageLicenseURL = licenseManagementUrl || licensePageUrl;
  return (
    <EuiCard
      display="plain"
      paddingSize="l"
      title={i18n.translate('xpack.observabilityShared.license.title', {
        defaultMessage: 'Start free 30-day trial',
      })}
      titleElement="h2"
      description={<EuiTextColor color="subdued">{text}</EuiTextColor>}
      footer={
        <EuiButton data-test-subj={dataTestSubj} fill href={manageLicenseURL}>
          {i18n.translate('xpack.observabilityShared.license.button', {
            defaultMessage: 'Start trial',
          })}
        </EuiButton>
      }
    />
  );
}
