/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { getUsersDetailsUrl } from '../../../../../../common/components/link_to/redirect_to_users';
import { SecurityPageName } from '../../../../../../app/types';
import { useGetSecuritySolutionLinkProps } from '../../../../../../common/components/links';

import { OPEN_USER_DETAILS_PAGE, SUMMARY_PANEL_ACTIONS, VIEW_USER_SUMMARY } from '../translation';

export const USER_PANEL_ACTIONS_CLASS = 'user-panel-actions-trigger';

export const UserPanelActions = React.memo(
  ({
    className,
    openUserDetailsPanel,
    userName,
  }: {
    className?: string;
    userName: string;
    openUserDetailsPanel: (userName: string) => void;
  }) => {
    const [isPopoverOpen, setPopover] = useState(false);
    const { href } = useGetSecuritySolutionLinkProps()({
      deepLinkId: SecurityPageName.users,
      path: getUsersDetailsUrl(userName),
    });

    const onButtonClick = useCallback(() => {
      setPopover(!isPopoverOpen);
    }, [isPopoverOpen]);

    const closePopover = () => {
      setPopover(false);
    };

    const handleopenUserDetailsPanel = useCallback(() => {
      openUserDetailsPanel(userName);
      closePopover();
    }, [userName, openUserDetailsPanel]);

    const items = useMemo(
      () => [
        <EuiContextMenuItem
          icon="expand"
          key="userActionsViewUserSummary"
          onClick={handleopenUserDetailsPanel}
          data-test-subj="user-panel-actions-view-summary"
        >
          {VIEW_USER_SUMMARY}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          icon="popout"
          key="userActionsOpenUserDetailsPage"
          data-test-subj="user-panel-actions-open-user-details"
          onClick={closePopover}
          href={href}
          target="_blank"
        >
          {OPEN_USER_DETAILS_PAGE}
        </EuiContextMenuItem>,
      ],
      [handleopenUserDetailsPanel, href]
    );

    const button = useMemo(
      () => (
        <EuiButtonIcon
          aria-label={SUMMARY_PANEL_ACTIONS}
          className={USER_PANEL_ACTIONS_CLASS}
          iconType="boxesHorizontal"
          onClick={onButtonClick}
        />
      ),
      [onButtonClick]
    );

    return (
      <div className={className}>
        <EuiPopover
          button={button}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
          panelClassName="withHoverActions__popover"
        >
          <EuiContextMenuPanel data-test-subj="user-actions-panel" size="s" items={items} />
        </EuiPopover>
      </div>
    );
  }
);

UserPanelActions.displayName = 'UserPanelActions';
