/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiText, EuiIcon, EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';
import { useKibana } from '../../../../../common/lib/kibana';

const Container = styled('div')`
  padding: 0 23px;
`;

const CenteredEuiFlexItem = styled(EuiFlexItem)`
  align-items: center;
`;

const LargeLogo = styled(EuiIcon)`
  width: 128px;
  height: 128px;
`;

const LargeCustomSpacer = () => (
  <>
    <EuiSpacer size="m" />
    <EuiSpacer size="xxl" />
  </>
);

const MediumCustomSpacer = () => (
  <>
    <EuiSpacer size="m" />
    <EuiSpacer size="xl" />
  </>
);

/**
 * A component to be displayed in multi step onboarding process.
 */
export const EndpointPolicyCreateMultiStepExtension = memo(() => {
  const { docLinks } = useKibana().services;

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
              defaultMessage="Windows, Mac, and Linux event collection"
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
          defaultMessage="You can change this later by editing the Endpoint Security integration agent policy.
      Read more about Endpoint security configuration in our {docsPage}."
          values={{
            docsPage: (
              <EuiLink href={docLinks.links.securitySolution.configureEndpointIntegrationPolicy}>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policy.multiStepOnboarding.docsPage"
                  defaultMessage="documentation"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiText>
  );

  return (
    <Container>
      <LargeCustomSpacer />
      {title}
      <MediumCustomSpacer />

      <EuiFlexGroup>
        <CenteredEuiFlexItem grow={false}>
          <LargeLogo type="logoSecurity" />
        </CenteredEuiFlexItem>

        <EuiFlexItem>
          <div>{features}</div>
        </EuiFlexItem>
      </EuiFlexGroup>

      <MediumCustomSpacer />
      {details}
      <LargeCustomSpacer />
    </Container>
  );
});
EndpointPolicyCreateMultiStepExtension.displayName = 'EndpointPolicyCreateMultiStepExtension';
