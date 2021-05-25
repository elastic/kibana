/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItemProps,
  EuiContextMenuPanel,
  EuiContextMenuPanelProps,
  EuiPopover,
  EuiPopoverProps,
} from '@elastic/eui';
import { NavigateToAppOptions } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { ContextMenuItemNavByRouter } from './context_menu_item_nav_by_rotuer';

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
      return <ContextMenuItemNavByRouter {...itemProps} onClick={handleCloseMenu} />;
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

ContextMenuItemNavByRouter.displayName = 'EuiContextMenuItemNavByRouter';
