/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { SecurityPageName } from '../../../../../../app/types';
import { useGetSecuritySolutionLinkProps } from '../../../../../../common/components/links';
import { getHostDetailsUrl } from '../../../../../../common/components/link_to';

import { OPEN_HOST_DETAILS_PAGE, SUMMARY_PANEL_ACTIONS, VIEW_HOST_SUMMARY } from '../translation';

export const HOST_PANEL_ACTIONS_CLASS = 'host-panel-actions-trigger';

export const HostPanelActions = React.memo(
  ({
    className,
    openHostDetailsPanel,
    hostName,
  }: {
    className?: string;
    hostName: string;
    openHostDetailsPanel: (hostName: string) => void;
  }) => {
    const [isPopoverOpen, setPopover] = useState(false);
    const { href } = useGetSecuritySolutionLinkProps()({
      deepLinkId: SecurityPageName.hosts,
      path: getHostDetailsUrl(hostName),
    });

    const onButtonClick = useCallback(() => {
      setPopover(!isPopoverOpen);
    }, [isPopoverOpen]);

    const closePopover = () => {
      setPopover(false);
    };

    const handleOpenHostDetailsPanel = useCallback(() => {
      openHostDetailsPanel(hostName);
      closePopover();
    }, [hostName, openHostDetailsPanel]);

    const items = useMemo(
      () => [
        <EuiContextMenuItem
          icon="expand"
          key="hostActionsViewHostSummary"
          onClick={handleOpenHostDetailsPanel}
          data-test-subj="host-panel-actions-view-summary"
        >
          {VIEW_HOST_SUMMARY}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          icon="popout"
          key="hostActionsOpenHostDetailsPage"
          data-test-subj="host-panel-actions-open-host-details"
          onClick={closePopover}
          href={href}
          target="_blank"
        >
          {OPEN_HOST_DETAILS_PAGE}
        </EuiContextMenuItem>,
      ],
      [handleOpenHostDetailsPanel, href]
    );

    const button = useMemo(
      () => (
        <EuiButtonIcon
          aria-label={SUMMARY_PANEL_ACTIONS}
          className={HOST_PANEL_ACTIONS_CLASS}
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
          <EuiContextMenuPanel data-test-subj="host-actions-panel" size="s" items={items} />
        </EuiPopover>
      </div>
    );
  }
);

HostPanelActions.displayName = 'HostPanelActions';
