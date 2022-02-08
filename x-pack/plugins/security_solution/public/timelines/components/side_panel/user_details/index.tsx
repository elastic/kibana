/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import {
  EuiFlexGroup,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlexItem,
  EuiButtonIcon,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import {
  ExpandableUserDetailsTitle,
  ExpandableUserDetailsPageLink,
  ExpandableUserDetails,
} from './expandable_user';

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

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  flex: 1 0 auto;
`;

const StyledEuiFlexButtonWrapper = styled(EuiFlexItem)`
  align-self: flex-start;
  flex: 1 0 auto;
`;

const StyledPanelContent = styled.div`
  display: block;
  height: 100%;
  overflow-y: scroll;
  overflow-x: hidden;
`;

interface UserDetailsProps {
  contextID: string;
  userName: string;
  handleOnClose: () => void;
  isFlyoutView?: boolean;
  isDraggable?: boolean;
}

export const UserDetailsPanel = React.memo(
  ({ contextID, userName, handleOnClose, isFlyoutView, isDraggable }: UserDetailsProps) => {
    return isFlyoutView ? (
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
    ) : (
      <>
        <StyledEuiFlexGroup justifyContent="spaceBetween" wrap={false}>
          <EuiFlexItem grow={false}>
            <ExpandableUserDetailsTitle userName={userName} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              aria-label={i18n.translate(
                'xpack.securitySolution.timeline.sidePanel.networkDetails.close',
                {
                  defaultMessage: 'close',
                }
              )}
              onClick={handleOnClose}
            />
          </EuiFlexItem>
        </StyledEuiFlexGroup>
        <EuiSpacer size="m" />
        <StyledEuiFlexButtonWrapper grow={false}>
          <ExpandableUserDetailsPageLink userName={userName} />
        </StyledEuiFlexButtonWrapper>
        <EuiSpacer size="m" />
        <StyledPanelContent>
          <ExpandableUserDetails
            contextID={contextID}
            userName={userName}
            isDraggable={isDraggable}
          />
        </StyledPanelContent>
      </>
    );
  }
);
