/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

// import { useLocation } from 'react-router-dom';
import { EuiFlexItem, EuiPanel, EuiSpacer, EuiTitle, EuiText, EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

// import { ConnectorDeployment } from '../../connector_detail/deployment';

interface DeploymentStepProps {
  currentStep: number;
  setCurrentStep: Function;
}

export const DeploymentStep: React.FC<DeploymentStepProps> = ({ currentStep, setCurrentStep }) => {
  return (
    <>
      {/* <ConnectorDeployment /> */}
      <EuiFlexItem>
        <EuiPanel hasShadow={false} hasBorder paddingSize="l">
          <EuiTitle size="s">
            <h4>
              {i18n.translate('xpack.enterpriseSearch.DeploymentStep.Configuration.title', {
                defaultMessage: 'Configuration',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiText size="s">
            <p>
              {i18n.translate('xpack.enterpriseSearch.DeploymentStep.Configuration.description', {
                defaultMessage: 'Now configure your Elastic crawler and sync the data.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton
            data-test-subj="enterpriseSearchStartStepGenerateConfigurationButton"
            onClick={() => setCurrentStep(currentStep + 1)}
            fill
          >
            {i18n.translate('xpack.enterpriseSearch.DeploymentStep.Configuration.button.continue', {
              defaultMessage: 'Contiue',
            })}
          </EuiButton>
        </EuiPanel>
      </EuiFlexItem>
    </>
  );
};
