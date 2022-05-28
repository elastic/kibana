/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutHeader, EuiFlyoutBody, EuiSpacer } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import {
  ExpandableUserDetailsTitle,
  ExpandableUserDetailsPageLink,
  ExpandableUserDetails,
} from './expandable_user';
import type { UserDetailsProps } from './types';

const StyledEuiFlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflow {
    display: flex;
    flex: 1;
    overflow-x: hidden;
    overflow-y: scroll;

    .euiFlyoutBody__overflowContent {
      flex: 1;
      overflow-x: hidden;
      overflow-y: scroll;
      padding: ${({ theme }) => `${theme.eui.paddingSizes.xs} ${theme.eui.paddingSizes.m} 64px`};
    }
  }
`;

export const UserDetailsFlyout = ({
  contextID,
  userName,
}: Pick<UserDetailsProps, 'contextID' | 'userName'>) => (
  <>
    <EuiFlyoutHeader hasBorder>
      <ExpandableUserDetailsTitle userName={userName} />
    </EuiFlyoutHeader>
    <StyledEuiFlyoutBody>
      <EuiSpacer size="m" />
      <ExpandableUserDetailsPageLink userName={userName} />
      <EuiSpacer size="m" />
      <ExpandableUserDetails contextID={contextID} userName={userName} />
    </StyledEuiFlyoutBody>
  </>
);
