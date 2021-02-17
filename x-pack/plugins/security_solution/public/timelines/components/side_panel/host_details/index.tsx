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
  flex: 0;
`;

const StyledEuiFlexItem = styled(EuiFlexItem)`
  &.euiFlexItem {
    flex: 1 0 0;
    overflow-y: scroll;
    overflow-x: hidden;
  }
`;

const StyledEuiFlexButtonWrapper = styled(EuiFlexItem)`
  align-self: flex-start;
`;

interface HostDetailsProps {
  contextID: string;
  expandedHost: { hostName: string };
  handleOnHostClosed: () => void;
  isFlyoutView?: boolean;
}

export const HostDetailsPanel: React.FC<HostDetailsProps> = React.memo(
  ({ contextID, expandedHost, handleOnHostClosed, isFlyoutView }) => {
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
        <StyledEuiFlexItem grow={true}>
          <ExpandableHostDetails contextID={contextID} hostName={hostName} />
        </StyledEuiFlexItem>
      </>
    );
  }
);
