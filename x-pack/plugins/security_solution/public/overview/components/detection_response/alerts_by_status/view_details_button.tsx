/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

export interface ViewDetailsButtonProps {
  onClick?: () => void;
  href?: string;
  name: string;
}

const StyledLinkButton = styled(EuiButton)`
  margin-left: ${({ theme }) => theme.eui.paddingSizes.l};
`;

const ViewDetailsButtonComponent: React.FC<ViewDetailsButtonProps> = ({ onClick, href, name }) => {
  return name && (onClick || href) ? (
    <StyledLinkButton data-test-subj="view-details-button" onClick={onClick} href={href}>
      {name}
    </StyledLinkButton>
  ) : null;
};

export const ViewDetailsButton = React.memo(ViewDetailsButtonComponent);
