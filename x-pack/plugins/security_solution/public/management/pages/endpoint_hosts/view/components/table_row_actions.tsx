/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiPopover,
  EuiContextMenuItemProps,
  EuiContextMenuPanelProps,
  EuiContextMenuItem,
  EuiPopoverProps,
} from '@elastic/eui';
import { NavigateToAppOptions } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { useNavigateToAppEventHandler } from '../../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';

export interface TableRowActionProps {
  items: Array<
    Omit<EuiContextMenuItemProps, 'onClick'> & {
      navigateAppId: string;
      navigateOptions: NavigateToAppOptions;
      children: React.ReactNode;
      key: string;
    }
  >;
}

export const TableRowActions = memo<TableRowActionProps>(({ items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const handleCloseMenu = useCallback(() => setIsOpen(false), [setIsOpen]);
  const handleToggleMenu = useCallback(() => setIsOpen(!isOpen), [isOpen]);

  const menuItems: EuiContextMenuPanelProps['items'] = useMemo(() => {
    return items.map((itemProps) => {
      return <EuiContextMenuItemNavByRouter {...itemProps} onClick={handleCloseMenu} />;
    });
  }, [handleCloseMenu, items]);

  const panelProps: EuiPopoverProps['panelProps'] = useMemo(() => {
    return { 'data-test-subj': 'tableRowActionsMenuPanel' };
  }, []);

  return (
    <EuiPopover
      anchorPosition="downRight"
      panelPaddingSize="none"
      panelProps={panelProps}
      button={
        <EuiButtonIcon
          data-test-subj="endpointTableRowActions"
          iconType="boxesHorizontal"
          onClick={handleToggleMenu}
          aria-label={i18n.translate('xpack.securitySolution.endpoint.list.actionmenu', {
            defaultMessage: 'Open',
          })}
        />
      }
      isOpen={isOpen}
      closePopover={handleCloseMenu}
    >
      <EuiContextMenuPanel items={menuItems} />
    </EuiPopover>
  );
});
TableRowActions.displayName = 'EndpointTableRowActions';

const EuiContextMenuItemNavByRouter = memo<
  EuiContextMenuItemProps & {
    navigateAppId: string;
    navigateOptions: NavigateToAppOptions;
    children: React.ReactNode;
  }
>(({ navigateAppId, navigateOptions, onClick, children, ...otherMenuItemProps }) => {
  const handleOnClick = useNavigateToAppEventHandler(navigateAppId, {
    ...navigateOptions,
    onClick,
  });

  return (
    <EuiContextMenuItem {...otherMenuItemProps} onClick={handleOnClick}>
      {children}
    </EuiContextMenuItem>
  );
});
EuiContextMenuItemNavByRouter.displayName = 'EuiContextMenuItemNavByRouter';
