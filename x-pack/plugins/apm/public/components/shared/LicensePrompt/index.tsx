/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiEmptyPrompt, EuiPanel } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useKibanaUrl } from '../../../hooks/useKibanaUrl';

interface Props {
  text: string;
  showBetaBadge?: boolean;
}

export const LicensePrompt = ({ text, showBetaBadge = false }: Props) => {
  const licensePageUrl = useKibanaUrl(
    '/app/kibana',
    '/management/stack/license_management/home'
  );

  const renderLicenseBody = (
    <EuiEmptyPrompt
      iconType="iInCircle"
      iconColor="subdued"
      title={
        <h2>
          {i18n.translate('xpack.apm.license.title', {
            defaultMessage: 'Start free 30-day trial',
          })}
        </h2>
      }
      body={<p>{text}</p>}
      actions={
        <EuiButton fill={true} href={licensePageUrl}>
          {i18n.translate('xpack.apm.license.button', {
            defaultMessage: 'Start trial',
          })}
        </EuiButton>
      }
    />
  );

  const renderWithBetaBadge = (
    <EuiPanel
      betaBadgeLabel={i18n.translate('xpack.apm.license.betaBadge', {
        defaultMessage: 'Beta',
      })}
      betaBadgeTooltipContent={i18n.translate(
        'xpack.apm.license.betaTooltipMessage',
        {
          defaultMessage:
            'This feature is currently in beta. If you encounter any bugs or have feedback, please open an issue or visit our discussion forum.',
        }
      )}
    >
      {renderLicenseBody}
    </EuiPanel>
  );

  return <>{showBetaBadge ? renderWithBetaBadge : renderLicenseBody}</>;
};
