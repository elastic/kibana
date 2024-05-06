/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlexItem,
  EuiButtonIcon,
  EuiSpacer,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { AssetCriticalityAccordion } from '../../../../entity_analytics/components/asset_criticality/asset_criticality_selector';
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
      padding: ${({ theme }) => `${theme.eui.euiSizeXS} ${theme.eui.euiSizeM} 0px`};
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
  scopeId: string;
  expandedHost: { hostName: string };
  handleOnHostClosed: () => void;
  isFlyoutView?: boolean;
  isDraggable?: boolean;
}

// eslint-disable-next-line react/display-name
export const HostDetailsPanel: React.FC<HostDetailsProps> = React.memo(
  ({ contextID, scopeId, expandedHost, handleOnHostClosed, isDraggable, isFlyoutView }) => {
    const { hostName } = expandedHost;
    const entity = useMemo(() => ({ name: hostName, type: 'host' as const }), [hostName]);
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
          <EuiHorizontalRule />
          <AssetCriticalityAccordion entity={entity} />
          <ExpandableHostDetails contextID={contextID} scopeId={scopeId} hostName={hostName} />
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
        <AssetCriticalityAccordion entity={entity} />
        <StyledPanelContent>
          <ExpandableHostDetails
            contextID={contextID}
            scopeId={scopeId}
            hostName={hostName}
            isDraggable={isDraggable}
          />
        </StyledPanelContent>
      </>
    );
  }
);
