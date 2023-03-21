/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiLink, EuiCallOut, EuiText } from '@elastic/eui';
import type { PolicyResponseActionFormatter } from './policy_response_friendly_names';

const StyledEuiCallout = styled(EuiCallOut)`
  padding: ${({ theme }) => theme.eui.euiSizeS};
`;

const StyledEuiText = styled(EuiText)`
  white-space: break-spaces;
  text-align: left;
  line-height: inherit;
`;

interface PolicyResponseActionItemProps {
  policyResponseActionFormatter: PolicyResponseActionFormatter;
}
/**
 * A policy response action item
 */
export const PolicyResponseActionItem = memo(
  ({ policyResponseActionFormatter }: PolicyResponseActionItemProps) => {
    return policyResponseActionFormatter.hasError ? (
      <StyledEuiCallout
        title={policyResponseActionFormatter.errorTitle}
        color="danger"
        iconType="alert"
        data-test-subj="endpointPolicyResponseErrorCallOut"
      >
        <StyledEuiText size="s" data-test-subj="endpointPolicyResponseMessage">
          {policyResponseActionFormatter.errorDescription}
          {policyResponseActionFormatter.linkText && policyResponseActionFormatter.linkUrl && (
            <EuiLink
              target="_blank"
              href={policyResponseActionFormatter.linkUrl}
              data-test-subj="endpointPolicyResponseErrorCallOutLink"
            >
              {policyResponseActionFormatter.linkText}
            </EuiLink>
          )}
        </StyledEuiText>
      </StyledEuiCallout>
    ) : (
      <StyledEuiText size="xs" data-test-subj="endpointPolicyResponseMessage">
        {policyResponseActionFormatter.description || policyResponseActionFormatter.title}
      </StyledEuiText>
    );
  }
);

PolicyResponseActionItem.displayName = 'PolicyResponseActionItem';
