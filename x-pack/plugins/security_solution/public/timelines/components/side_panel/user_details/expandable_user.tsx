/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import React from 'react';
import { UserDetailsLink } from '../../../../common/components/links';

export interface ExpandableUserProps {
  userName: string;
}

const StyledTitle = styled.h4`
  word-break: break-all;
  word-wrap: break-word;
  white-space: pre-wrap;
`;

export const ExpandableUserDetailsTitle = ({ userName }: { userName: string }) => (
  <EuiTitle size="s">
    <StyledTitle>
      {i18n.translate('xpack.securitySolution.timeline.sidePanel.userDetails.title', {
        defaultMessage: 'User details',
      })}
      {`: ${userName}`}
    </StyledTitle>
  </EuiTitle>
);

export const ExpandableUserDetailsPageLink = ({ userName }: ExpandableUserProps) => (
  <UserDetailsLink userName={userName} isButton>
    {i18n.translate('xpack.securitySolution.timeline.sidePanel.networkDetails.userDetails', {
      defaultMessage: 'View details page',
    })}
  </UserDetailsLink>
);

export const ExpandableUserDetails = ({
  contextID,
  userName,
  isDraggable,
}: ExpandableUserProps & { contextID: string; isDraggable?: boolean }) => {
  return <>{'TODO I am empty'}</>;
};
