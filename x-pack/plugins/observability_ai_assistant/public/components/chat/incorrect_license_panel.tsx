/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import { UPGRADE_LICENSE_TITLE } from '../../i18n';
import ctaImage from '../../assets/elastic-ai-assistant.png';
import { useLicenseManagementLocator } from '../../hooks/use_license_management_locator';

const incorrectLicenseContainer = css`
  height: 100%;
  padding: ${euiThemeVars.euiPanelPaddingModifiers.paddingMedium};
`;

export function IncorrectLicensePanel() {
  const handleNavigateToLicenseManagement = useLicenseManagementLocator();

  return (
    <EuiPanel hasBorder hasShadow={false}>
      <EuiFlexGroup
        direction="column"
        alignItems="center"
        justifyContent="center"
        className={incorrectLicenseContainer}
      >
        <EuiImage src={ctaImage} alt="Elastic AI Assistant" size="l" />
        <EuiTitle>
          <h2>{UPGRADE_LICENSE_TITLE}</h2>
        </EuiTitle>
        <EuiText color="subdued">
          <p>
            {i18n.translate('xpack.observabilityAiAssistant.incorrectLicense.body', {
              defaultMessage: 'You need a Platinum license to use the Elastic AI Assistant.',
            })}
          </p>
        </EuiText>
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton fill href="https://www.elastic.co/subscriptions" target="_blank">
                {i18n.translate(
                  'xpack.observabilityAiAssistant.incorrectLicense.subscriptionPlansButton',
                  {
                    defaultMessage: 'Subscription plans',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonEmpty onClick={handleNavigateToLicenseManagement}>
                {i18n.translate('xpack.observabilityAiAssistant.incorrectLicense.manageLicense', {
                  defaultMessage: 'Manage license',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
