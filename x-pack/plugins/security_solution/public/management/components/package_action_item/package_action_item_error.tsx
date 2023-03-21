/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiLink, EuiCallOut, EuiText } from '@elastic/eui';
import type { PackageActionFormatter } from './package_action_formatter';

const StyledEuiCallout = styled(EuiCallOut)`
  padding: ${({ theme }) => theme.eui.euiSizeS};
`;

const StyledEuiText = styled(EuiText)`
  white-space: break-spaces;
  text-align: left;
  line-height: inherit;
`;

interface PackageActionItemErrorProps {
  actionFormatter: PackageActionFormatter;
}
/**
 * A package action item error
 */
export const PackageActionItemError = memo(({ actionFormatter }: PackageActionItemErrorProps) => {
  return (
    <StyledEuiCallout
      title={actionFormatter.title}
      color="danger"
      iconType="alert"
      data-test-subj="packageItemErrorCallOut"
    >
      <StyledEuiText size="s" data-test-subj="packageItemErrorCallOutMessage">
        {actionFormatter.description}
        {actionFormatter.linkText && actionFormatter.linkUrl && (
          <EuiLink
            target="_blank"
            href={actionFormatter.linkUrl}
            data-test-subj="packageItemErrorCallOutLink"
          >
            {actionFormatter.linkText}
          </EuiLink>
        )}
      </StyledEuiText>
    </StyledEuiCallout>
  );
});

PackageActionItemError.displayName = 'PackageActionItemError';
