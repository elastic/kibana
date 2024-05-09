/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCard, EuiTextColor } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useKibanaUrl } from '../../../hooks/use_kibana_url';

export interface LicensePromptProps {
  text: string;
}

export function LicensePrompt({ text }: LicensePromptProps) {
  const {
    plugins: { licenseManagement },
  } = useApmPluginContext();
  const licensePageUrl = useKibanaUrl('/app/management/stack/license_management');
  const manageLicenseURL = licenseManagement?.locator
    ? licenseManagement?.locator?.useUrl({
        page: 'dashboard',
      })
    : licensePageUrl;
  return (
    <EuiCard
      display="plain"
      paddingSize="l"
      title={i18n.translate('xpack.apm.license.title', {
        defaultMessage: 'Start free 30-day trial',
      })}
      titleElement="h2"
      description={<EuiTextColor color="subdued">{text}</EuiTextColor>}
      footer={
        <EuiButton
          data-test-subj="apmLicensePromptStartTrialButton"
          fill={true}
          href={manageLicenseURL}
        >
          {i18n.translate('xpack.apm.license.button', {
            defaultMessage: 'Start trial',
          })}
        </EuiButton>
      }
    />
  );
}
