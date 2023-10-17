/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ExpandFlyoutButton } from '../components/expand_flyout_button';
import { useExpandDetailsFlyout } from '../hooks/use_expand_details_flyout';
import { UserDetailsContent } from '../components/user_details_content';

export interface UserPanelProps {
  contextID: string;
  scopeId: string;
  userName: string;
  isDraggable?: boolean;
}

const flyoutIsExpandable = true;

export const UserDetailsPanel = ({ contextID, scopeId, userName, isDraggable }: UserPanelProps) => {
  const { isExpanded, onToggle } = useExpandDetailsFlyout();
  return (
    <>
      <EuiFlyoutHeader
        hasBorder
        css={css`
          &.euiFlyoutHeader {
            padding: 5px 0;
          }
        `}
      >
        {flyoutIsExpandable && (
          <ExpandFlyoutButton
            isExpanded={isExpanded}
            onToggle={onToggle}
            expandedText={i18n.translate(
              'xpack.securitySolution.flyout.right.header.expandDetailButtonLabel',
              {
                defaultMessage: 'Collapse details',
              }
            )}
            collapsedText={i18n.translate(
              'xpack.securitySolution.flyout.right.header.collapseDetailButtonLabel',
              {
                defaultMessage: 'Expand details',
              }
            )}
          />
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody
        css={css`
          .euiFlyoutBody__overflowContent {
            padding: 0;
          }
        `}
      >
        <UserDetailsContent
          userName={userName}
          contextID={contextID}
          scopeId={scopeId}
          isDraggable={isDraggable}
        />
      </EuiFlyoutBody>
    </>
  );
};

UserDetailsPanel.displayName = 'UserDetailsPanel';
