/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import type { EuiContextMenuPanelProps, EuiPopoverProps } from '@elastic/eui';
import { EuiButtonIcon, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ContextMenuItemNavByRouter } from '../../../../components/context_menu_with_router_support/context_menu_item_nav_by_router';
import type { HostMetadata } from '../../../../../../common/endpoint/types';
import { useEndpointActionItems } from '../hooks';

export interface TableRowActionProps {
  endpointMetadata: HostMetadata;
}

export const TableRowActions = memo<TableRowActionProps>(({ endpointMetadata }) => {
  const [isOpen, setIsOpen] = useState(false);
  const endpointActions = useEndpointActionItems(endpointMetadata, { isEndpointList: true });

  const handleCloseMenu = useCallback(() => setIsOpen(false), [setIsOpen]);
  const handleToggleMenu = useCallback(() => setIsOpen(!isOpen), [isOpen]);

  const menuItems: EuiContextMenuPanelProps['items'] = useMemo(() => {
    return endpointActions.map((itemProps) => {
      return (
        <ContextMenuItemNavByRouter
          {...itemProps}
          onClick={(ev) => {
            handleCloseMenu();
            if (itemProps.onClick) {
              itemProps.onClick(ev);
            }
          }}
        />
      );
    });
  }, [handleCloseMenu, endpointActions]);

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
