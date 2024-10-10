/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { EuiFlexItem, EuiPanel, EuiSpacer, EuiText, EuiButton, EuiFlexGroup } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import * as Constants from '../../../../shared/constants';
import { ConnectorDeployment } from '../../connector_detail/deployment';

interface DeploymentStepProps {
  currentStep: number;
  isNextStepEnabled: boolean;
  setCurrentStep: Function;
}

export const DeploymentStep: React.FC<DeploymentStepProps> = ({
  currentStep,
  setCurrentStep,
  isNextStepEnabled,
}) => {
  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({
        behavior: 'smooth',
        top: 0,
      });
    }, 100);
  }, []);
  return (
    <EuiFlexGroup gutterSize="m" direction="column">
      <ConnectorDeployment />
      <EuiFlexItem>
        <EuiPanel
          hasShadow={false}
          hasBorder
          paddingSize="l"
          color={isNextStepEnabled ? 'plain' : 'subdued'}
        >
          <EuiText color={isNextStepEnabled ? 'default' : 'subdued'}>
            <h3>
              {i18n.translate(
                'xpack.enterpriseSearch.createConnector.DeploymentStep.Configuration.title',
                {
                  defaultMessage: 'Configuration',
                }
              )}
            </h3>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiText color={isNextStepEnabled ? 'default' : 'subdued'} size="s">
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.createConnector.DeploymentStep.Configuration.description',
                {
                  defaultMessage: 'Now configure your Elastic crawler and sync the data.',
                }
              )}
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton
            data-test-subj="enterpriseSearchStartStepGenerateConfigurationButton"
            onClick={() => setCurrentStep(currentStep + 1)}
            fill
            disabled={!isNextStepEnabled}
          >
            {Constants.NEXT_BUTTON_LABEL}
          </EuiButton>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
