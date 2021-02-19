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
import { FlowTarget } from '../../../../../common/search_strategy';
import {
  ExpandableNetworkDetailsTitle,
  ExpandableNetworkDetailsPageLink,
  ExpandableNetworkDetails,
} from './expandable_network';

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

interface NetworkDetailsProps {
  contextID: string;
  expandedNetwork: { ip: string; flowTarget: FlowTarget };
  handleOnNetworkClosed: () => void;
  isFlyoutView?: boolean;
}

export const NetworkDetailsPanel = React.memo(
  ({ contextID, expandedNetwork, handleOnNetworkClosed, isFlyoutView }: NetworkDetailsProps) => {
    const { ip } = expandedNetwork;

    return isFlyoutView ? (
      <>
        <EuiFlyoutHeader hasBorder>
          <ExpandableNetworkDetailsTitle ip={ip} />
        </EuiFlyoutHeader>
        <StyledEuiFlyoutBody>
          <EuiSpacer size="m" />
          <ExpandableNetworkDetailsPageLink expandedNetwork={expandedNetwork} />
          <EuiSpacer size="m" />
          <ExpandableNetworkDetails contextID={contextID} expandedNetwork={expandedNetwork} />
        </StyledEuiFlyoutBody>
      </>
    ) : (
      <>
        <StyledEuiFlexGroup justifyContent="spaceBetween" wrap={false}>
          <EuiFlexItem grow={false}>
            <ExpandableNetworkDetailsTitle ip={ip} />
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
              onClick={handleOnNetworkClosed}
            />
          </EuiFlexItem>
        </StyledEuiFlexGroup>
        <EuiSpacer size="m" />
        <StyledEuiFlexButtonWrapper grow={false}>
          <ExpandableNetworkDetailsPageLink expandedNetwork={expandedNetwork} />
        </StyledEuiFlexButtonWrapper>
        <EuiSpacer size="m" />
        <StyledEuiFlexItem grow={true}>
          <ExpandableNetworkDetails contextID={contextID} expandedNetwork={expandedNetwork} />
        </StyledEuiFlexItem>
      </>
    );
  }
);
