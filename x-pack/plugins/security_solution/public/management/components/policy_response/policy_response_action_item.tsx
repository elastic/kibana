/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiButton, EuiCallOut, EuiText, EuiSpacer } from '@elastic/eui';
import { HostPolicyResponseActionStatus } from '../../../../common/endpoint/types';

const StyledEuiCallout = styled(EuiCallOut)`
  padding: ${({ theme }) => theme.eui.paddingSizes.s};
  .action-message {
    white-space: break-spaces;
    text-align: left;
  }
`;

interface PolicyResponseActionItemProps {
  status: HostPolicyResponseActionStatus;
  actionTitle: string;
  actionMessage: string;
  actionButtonLabel?: string;
  actionButtonOnClick?: () => void;
}
/**
 * A policy response action item
 */
export const PolicyResponseActionItem = memo(
  ({
    status,
    actionTitle,
    actionMessage,
    actionButtonLabel,
    actionButtonOnClick,
  }: PolicyResponseActionItemProps) => {
    return status !== HostPolicyResponseActionStatus.success &&
      status !== HostPolicyResponseActionStatus.unsupported ? (
      <StyledEuiCallout title={actionTitle} color="danger" iconType="alert">
        <EuiText size="s" className="action-message" data-test-subj="endpointPolicyResponseMessage">
          {actionMessage}
        </EuiText>
        <EuiSpacer size="s" />
        {actionButtonLabel && actionButtonOnClick && (
          <EuiButton onClick={actionButtonOnClick} color="danger">
            {actionButtonLabel}
          </EuiButton>
        )}
      </StyledEuiCallout>
    ) : (
      <EuiText size="xs" data-test-subj="endpointPolicyResponseMessage">
        {actionMessage}
      </EuiText>
    );
  }
);

PolicyResponseActionItem.displayName = 'PolicyResponseActionItem';
