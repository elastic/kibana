/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiText,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import styled from 'styled-components';
import { css } from '@emotion/css';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../../common/lib/kibana';

const CenteredEuiFlexItem = styled(EuiFlexItem)`
  align-items: center;
`;

/**
 * A component to be displayed in multi step onboarding process.
 */
export const EndpointPolicyCreateMultiStepExtension = memo(() => {
  const { docLinks } = useKibana().services;
  const { size } = useEuiTheme().euiTheme;

  const title = (
    <EuiText>
      <h3>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.multiStepOnboarding.title"
          defaultMessage="We'll save your integration with our recommended defaults."
        />
      </h3>
    </EuiText>
  );

  const logoSize = `calc(2 * ${size.xxxxl})`;
  const securityLogo = (
    <EuiIcon
      type="logoSecurity"
      css={css`
        width: ${logoSize};
        height: ${logoSize};
      `}
    />
  );

  const features = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="check" />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiText size="m">
          <p>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.multiStepOnboarding.feature"
              defaultMessage="Windows, macOS, and Linux event collection"
            />
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const details = (
    <EuiText size="m" color="subdued">
      <p>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.multiStepOnboarding.details"
          defaultMessage="You can edit these settings later in the Elastic Defend integration policy."
        />
        &nbsp;
        <EuiLink
          href={docLinks.links.securitySolution.configureEndpointIntegrationPolicy}
          target="_blank"
          external
        >
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.multiStepOnboarding.learnMore"
            defaultMessage="Learn more"
          />
        </EuiLink>
      </p>
    </EuiText>
  );

  return (
    <EuiPanel hasShadow={false} paddingSize="l">
      <EuiSpacer size="xl" />

      {title}

      <EuiFlexGroup
        css={css`
          padding: ${size.xxxl} 0;
        `}
      >
        <CenteredEuiFlexItem grow={false}>{securityLogo}</CenteredEuiFlexItem>

        <EuiFlexItem>
          <div>{features}</div>
        </EuiFlexItem>
      </EuiFlexGroup>

      {details}

      <EuiSpacer size="xl" />
    </EuiPanel>
  );
});
EndpointPolicyCreateMultiStepExtension.displayName = 'EndpointPolicyCreateMultiStepExtension';
