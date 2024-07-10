/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiContextMenuItemProps,
  EuiButtonEmpty,
} from '@elastic/eui';

export interface LogEntryContextMenuItem {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  href?: string;
}

export interface LogEntryContextMenuProps {
  'aria-label'?: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  items: LogEntryContextMenuItem[];
  externalItems?: EuiContextMenuItemProps[];
}

const DEFAULT_MENU_LABEL = i18n.translate(
  'xpack.logsShared.logEntryItemView.logEntryActionsMenuToolTip',
  {
    defaultMessage: 'View actions for line',
  }
);

export const LogEntryContextMenu: React.FC<LogEntryContextMenuProps> = ({
  'aria-label': ariaLabel,
  isOpen,
  onOpen,
  onClose,
  items,
  externalItems,
}) => {
  const closeMenuAndCall = useMemo(() => {
    return (callback: LogEntryContextMenuItem['onClick'] | EuiContextMenuItemProps['onClick']) => {
      return (e: React.MouseEvent) => {
        onClose();
        callback?.(e);
      };
    };
  }, [onClose]);

  const button = (
    <EuiButtonEmpty
      css={{ transform: 'translate(-6px, -6px)' }}
      data-test-subj="infraLogEntryContextMenuButton"
      size="s"
      aria-label={ariaLabel || DEFAULT_MENU_LABEL}
      onClick={isOpen ? onClose : onOpen}
      iconType="boxesHorizontal"
    />
  );

  const wrappedItems = useMemo(() => {
    return items
      .map((item, i) => (
        <EuiContextMenuItem key={i} onClick={closeMenuAndCall(item.onClick)} href={item.href}>
          {item.label}
        </EuiContextMenuItem>
      ))
      .concat(
        (externalItems ?? []).map((item, i) => (
          <EuiContextMenuItem
            key={`external_${i}`}
            {...item}
            onClick={closeMenuAndCall(item.onClick)}
          />
        ))
      );
  }, [items, closeMenuAndCall, externalItems]);

  return (
    <EuiPopover
      css={{
        overflow: 'hidden',
        userSelect: 'none',
        position: 'absolute',
      }}
      panelPaddingSize="none"
      closePopover={onClose}
      isOpen={isOpen}
      button={button}
      ownFocus={true}
    >
      <EuiContextMenuPanel items={wrappedItems} />
    </EuiPopover>
  );
};

// eslint-disable-next-line import/no-default-export
export default LogEntryContextMenu;
