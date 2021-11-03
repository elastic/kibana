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
  ExpandableHostDetails,
  ExpandableHostDetailsPageLink,
  ExpandableHostDetailsTitle,
} from './expandable_host';

const StyledEuiFlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflow {
    display: flex;
    flex: 1;
    overflow: hidden;

    .euiFlyoutBody__overflowContent {
      flex: 1;
      overflow-x: hidden;
      overflow-y: scroll;
      margin-bottom: 64px; // account for firefox, which doesn't seem to respect the bottom padding
      padding: ${({ theme }) => `${theme.eui.paddingSizes.xs} ${theme.eui.paddingSizes.m} 0px`};
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

interface HostDetailsProps {
  contextID: string;
  expandedHost: { hostName: string };
  handleOnHostClosed: () => void;
  isFlyoutView?: boolean;
  isDraggable?: boolean;
}

export const HostDetailsPanel: React.FC<HostDetailsProps> = React.memo(
  ({ contextID, expandedHost, handleOnHostClosed, isDraggable, isFlyoutView }) => {
    const { hostName } = expandedHost;

    if (!hostName) {
      return null;
    }

    return isFlyoutView ? (
      <>
        <EuiFlyoutHeader hasBorder>
          <ExpandableHostDetailsTitle hostName={hostName} />
        </EuiFlyoutHeader>
        <StyledEuiFlyoutBody>
          <EuiSpacer size="m" />
          <ExpandableHostDetailsPageLink hostName={hostName} />
          <EuiSpacer size="m" />
          <ExpandableHostDetails contextID={contextID} hostName={hostName} />
        </StyledEuiFlyoutBody>
      </>
    ) : (
      <>
        <StyledEuiFlexGroup justifyContent="spaceBetween" wrap={false}>
          <EuiFlexItem grow={false}>
            <ExpandableHostDetailsTitle hostName={hostName} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              aria-label={i18n.translate(
                'xpack.securitySolution.timeline.sidePanel.hostDetails.close',
                {
                  defaultMessage: 'close',
                }
              )}
              onClick={handleOnHostClosed}
            />
          </EuiFlexItem>
        </StyledEuiFlexGroup>
        <EuiSpacer size="m" />
        <StyledEuiFlexButtonWrapper grow={false}>
          <ExpandableHostDetailsPageLink hostName={hostName} />
        </StyledEuiFlexButtonWrapper>
        <EuiSpacer size="m" />
        <StyledPanelContent>
          <ExpandableHostDetails
            contextID={contextID}
            hostName={hostName}
            isDraggable={isDraggable}
          />
        </StyledPanelContent>
      </>
    );
  }
);
