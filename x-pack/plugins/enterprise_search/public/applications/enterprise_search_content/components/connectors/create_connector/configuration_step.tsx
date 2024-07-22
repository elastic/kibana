/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// import { FormattedMessage } from '@kbn/i18n-react';

interface ConfigurationStepProps {
  currentStep: number;
  isNextStepEnabled: boolean;
  setCurrentStep: Function;
  setNextStepEnabled: Function;
  title: string;
}

export const ConfigurationStep: React.FC<ConfigurationStepProps> = ({
  title,
  currentStep,
  setCurrentStep,
  isNextStepEnabled,
  setNextStepEnabled,
}) => {
  return (
    <>
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l">
            <EuiTitle size="m">
              <h3>{title}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiButton
              data-test-subj="enterpriseSearchStartStepGenerateConfigurationButton"
              onClick={() => setNextStepEnabled(true)}
            >
              {i18n.translate('xpack.enterpriseSearch.configurationStep.button.simulateSave', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l">
            <EuiTitle size="s">
              <h4>
                {i18n.translate('xpack.enterpriseSearch.configurationStep.h4.finishUpLabel', {
                  defaultMessage: 'Finish up',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.enterpriseSearch.configurationStep.p.description', {
                  defaultMessage:
                    'You can manually sync your data, schedule a recurring sync or manage your domains.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiButton
              data-test-subj="enterpriseSearchStartStepGenerateConfigurationButton"
              onClick={() => setCurrentStep(currentStep + 1)}
              fill
              disabled={!isNextStepEnabled}
            >
              {i18n.translate('xpack.enterpriseSearch.configurationStep.button', {
                defaultMessage: 'Contiue',
              })}
            </EuiButton>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
