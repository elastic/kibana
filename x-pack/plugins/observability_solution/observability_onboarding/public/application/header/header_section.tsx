/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPageTemplate,
  EuiSpacer,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './header';
import backgroundImageUrl from './background.svg';
import { useIconForLogo } from '../../hooks/use_icon_for_logo';

export function HeaderSection() {
  const path = useLocation().pathname;
  const kubernetesLogo = useIconForLogo('kubernetes');
  const theme = useEuiTheme();
  const shadow = useEuiShadow('s');
  //  theme.euiTheme.size.
  if (path === '/kubernetes') {
    return (
      <EuiPageTemplate.Section paddingSize="xl">
        <EuiButtonEmpty
          iconType="arrowLeft"
          flush="left"
          href="/observability"
          data-test-subj="observabilityOnboardingFlowBackToSelectionButton"
        >
          <FormattedMessage
            id="xpack.observability_onboarding.experimentalOnboardingFlow.button.returnButtonLabel"
            defaultMessage="Return"
          />
        </EuiButtonEmpty>
        <EuiSpacer size="l" />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <div
              css={css`
                border-radius: ${theme.euiTheme.border.radius.medium};
                ${shadow}
              `}
            >
              <EuiIcon
                size="xxl"
                type={kubernetesLogo}
                css={css`
                  margin: 12px;
                  width: 56px;
                  height: 56px;
                `}
              />
            </div>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle>
              <h1>
                <FormattedMessage
                  id="xpack.observability_onboarding.experimentalOnboardingFlow.header.text"
                  defaultMessage="Setting up Kubernetes with Elastic Agent"
                />
              </h1>
            </EuiTitle>
            <EuiSpacer size="l" />
            <p>
              <FormattedMessage
                id="xpack.observability_onboarding.experimentalOnboardingFlow.kubernetesDescription"
                defaultMessage="This installation is tailored for configuring and collecting metrics and logs by deploying a new Elastic Agent within your host"
              />
            </p>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    );
  }
  return (
    <EuiPageTemplate.Section
      paddingSize="xl"
      css={css`
        & > div {
          background-image: url(${backgroundImageUrl});
          background-position: right center;
          background-repeat: no-repeat;
        }
      `}
      grow={false}
      restrictWidth
    >
      <EuiSpacer size="xl" />
      <Header />
    </EuiPageTemplate.Section>
  );
}
