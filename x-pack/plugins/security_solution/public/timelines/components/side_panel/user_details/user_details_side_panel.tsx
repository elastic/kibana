/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { AssetCriticalityAccordion } from '../../../../entity_analytics/components/asset_criticality/asset_criticality_selector';
import {
  ExpandableUserDetailsTitle,
  ExpandableUserDetailsPageLink,
  ExpandableUserDetails,
} from './expandable_user';
import type { UserDetailsProps } from './types';

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

export const UserDetailsSidePanel = ({
  contextID,
  scopeId,
  userName,
  isDraggable,
  handleOnClose,
}: Pick<
  UserDetailsProps,
  'scopeId' | 'contextID' | 'userName' | 'isDraggable' | 'handleOnClose'
>) => {
  const entity = useMemo(() => ({ name: userName, type: 'user' as const }), [userName]);
  return (
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
      <AssetCriticalityAccordion entity={entity} />
      <StyledPanelContent>
        <ExpandableUserDetails
          contextID={contextID}
          scopeId={scopeId}
          userName={userName}
          isDraggable={isDraggable}
        />
      </StyledPanelContent>
    </>
  );
};
