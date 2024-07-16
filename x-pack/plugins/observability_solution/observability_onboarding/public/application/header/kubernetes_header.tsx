/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPageTemplate,
  EuiSpacer,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useIconForLogo } from '../../hooks/use_icon_for_logo';
import { BackButton } from '../shared/back_button';

export function KubernetesHeaderSection() {
  const kubernetesLogo = useIconForLogo('kubernetes');
  const theme = useEuiTheme();
  const shadow = useEuiShadow('s');
  return (
    <EuiPageTemplate.Section paddingSize="xl">
      <BackButton
        customLabel={i18n.translate(
          'xpack.observability_onboarding.experimentalOnboardingFlow.button.returnButtonLabel',
          {
            defaultMessage: 'Return',
          }
        )}
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <div
            css={css`
              border-radius: ${theme.euiTheme.border.radius.medium};
              ${shadow}
            `}
          >
            {!!kubernetesLogo && (
              <EuiIcon
                size="xxl"
                type={kubernetesLogo}
                css={css`
                  margin: 12px;
                  width: 56px;
                  height: 56px;
                `}
              />
            )}
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
