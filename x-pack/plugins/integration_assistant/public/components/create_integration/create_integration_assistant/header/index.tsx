/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { IntegrationsAssistantSteps } from './steps';
import * as i18n from './translations';

interface IntegrationAssistantHeaderProps {
  currentStep: number;
  setStep: (step: number) => void;
  isGenerating: boolean;
}

export const IntegrationAssistantHeader = React.memo<IntegrationAssistantHeaderProps>(
  ({ currentStep, setStep, isGenerating }) => {
    const { euiTheme } = useEuiTheme();
    return (
      <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="l">
        <EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiText>
            <h1>
              <span>{i18n.TITLE}</span>
              <EuiBetaBadge
                iconType={'beaker'}
                label={i18n.BETA}
                tooltipContent={i18n.BETA_TOOLTIP}
                size="m"
                color="hollow"
                css={css`
                  margin-left: ${euiTheme.size.m};
                `}
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            width: 100%;
          `}
        >
          <IntegrationsAssistantSteps
            currentStep={currentStep}
            setStep={setStep}
            isGenerating={isGenerating}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
IntegrationAssistantHeader.displayName = 'IntegrationAssistantHeader';
