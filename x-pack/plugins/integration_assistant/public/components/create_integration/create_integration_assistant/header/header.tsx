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
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { Steps } from './steps';
import * as i18n from './translations';

const useTechPreviewBadgeCss = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    margin-left: ${euiTheme.size.m};
  `;
};

// const useContentCss = () => {
//   const { euiTheme } = useEuiTheme();
//   return css`
//     width: 100%;
//     max-width: 80em;
//     padding: ${euiTheme.size.l};
//   `;
// };

const contentCss = css`
  width: 100%;
  max-width: 730px;
`;

interface HeaderProps {
  currentStep: number;
  setStep: (step: number) => void;
  isGenerating: boolean;
}
export const Header = React.memo<HeaderProps>(({ currentStep, setStep, isGenerating }) => {
  const techPreviewBadgeCss = useTechPreviewBadgeCss();
  return (
    <KibanaPageTemplate.Header>
      <EuiFlexGroup direction="column" alignItems="center">
        <EuiFlexItem css={contentCss}>
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
                    css={techPreviewBadgeCss}
                  />
                </h1>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem
              css={css`
                width: 100%;
              `}
            >
              <Steps currentStep={currentStep} setStep={setStep} isGenerating={isGenerating} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </KibanaPageTemplate.Header>
  );
});
Header.displayName = 'Header';
