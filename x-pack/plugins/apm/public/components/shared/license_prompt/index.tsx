/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCard, EuiTextColor } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useKibanaUrl } from '../../../hooks/use_kibana_url';

export interface LicensePromptProps {
  text: string;
  showBetaBadge?: boolean;
}

export function LicensePrompt({
  text,
  showBetaBadge = false,
}: LicensePromptProps) {
  const licensePageUrl = useKibanaUrl(
    '/app/management/stack/license_management'
  );

  return (
    <EuiCard
      display={showBetaBadge ? undefined : 'plain'}
      paddingSize="l"
      betaBadgeProps={{
        label: showBetaBadge
          ? i18n.translate('xpack.apm.license.betaBadge', {
              defaultMessage: 'Beta',
            })
          : undefined,
        tooltipContent: showBetaBadge
          ? i18n.translate('xpack.apm.license.betaTooltipMessage', {
              defaultMessage:
                'This feature is currently in beta. If you encounter any bugs or have feedback, please open an issue or visit our discussion forum.',
            })
          : undefined,
      }}
      title={i18n.translate('xpack.apm.license.title', {
        defaultMessage: 'Start free 30-day trial',
      })}
      titleElement="h2"
      description={<EuiTextColor color="subdued">{text}</EuiTextColor>}
      footer={
        <EuiButton fill={true} href={licensePageUrl}>
          {i18n.translate('xpack.apm.license.button', {
            defaultMessage: 'Start trial',
          })}
        </EuiButton>
      }
    />
  );
}
