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
  EuiPopoverProps,
  EuiContextMenuPanelProps,
  EuiIconProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import uuid from 'uuid';
import {
  ContextMenuItemNavByRouter,
  ContextMenuItemNavByRouterProps,
} from '../context_menu_with_router_support';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';

export interface ActionsContextMenuProps {
  items: ContextMenuItemNavByRouterProps[];
  /** Default icon is `boxesHorizontal` */
  icon?: EuiIconProps['type'];
  'data-test-subj'?: string;
}

/**
 * Display a context menu behind a icon button (which defaults to the three horizontal dots icon)
 */
export const ActionsContextMenu = memo<ActionsContextMenuProps>(
  ({ items, 'data-test-subj': dataTestSubj, icon = 'boxesHorizontal' }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const [isOpen, setIsOpen] = useState(false);

    const handleCloseMenu = useCallback(() => setIsOpen(false), [setIsOpen]);
    const handleToggleMenu = useCallback(() => setIsOpen(!isOpen), [isOpen]);

    const panelProps: EuiPopoverProps['panelProps'] = useMemo(() => {
      return { 'data-test-subj': getTestId('popoverPanel') };
    }, [getTestId]);

    const menuItems: EuiContextMenuPanelProps['items'] = useMemo(() => {
      return items.map((itemProps) => {
        return (
          <ContextMenuItemNavByRouter
            {...itemProps}
            key={uuid.v4()}
            onClick={(ev) => {
              handleCloseMenu();
              if (itemProps.onClick) {
                return itemProps.onClick(ev);
              }
            }}
          />
        );
      });
    }, [handleCloseMenu, items]);

    return (
      <EuiPopover
        anchorPosition="downRight"
        panelPaddingSize="none"
        panelProps={panelProps}
        data-test-subj={dataTestSubj}
        button={
          <EuiButtonIcon
            data-test-subj={getTestId('button')}
            iconType={icon}
            onClick={handleToggleMenu}
            aria-label={i18n.translate('xpack.securitySolution.actionsContextMenu.label', {
              defaultMessage: 'Open',
            })}
          />
        }
        isOpen={isOpen}
        closePopover={handleCloseMenu}
      >
        <EuiContextMenuPanel items={menuItems} data-test-subj={getTestId('contextMenuPanel')} />
      </EuiPopover>
    );
  }
);
ActionsContextMenu.displayName = 'ActionsContextMenu';
