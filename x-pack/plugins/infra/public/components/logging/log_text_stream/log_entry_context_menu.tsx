/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiPopover, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';

import { euiStyled } from '../../../../../observability/public';
import { LogEntryColumnContent } from './log_entry_column';

interface LogEntryContextMenuItem {
  label: string;
  onClick: () => void;
}

interface LogEntryContextMenuProps {
  'aria-label'?: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  items: LogEntryContextMenuItem[];
}

const DEFAULT_MENU_LABEL = i18n.translate(
  'xpack.infra.logEntryItemView.logEntryActionsMenuToolTip',
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
}) => {
  const closeMenuAndCall = useMemo(() => {
    return (callback: LogEntryContextMenuItem['onClick']) => {
      return () => {
        onClose();
        callback();
      };
    };
  }, [onClose]);

  const button = (
    <ButtonWrapper>
      <EuiButtonIcon
        aria-label={ariaLabel || DEFAULT_MENU_LABEL}
        color="ghost"
        iconType="boxesHorizontal"
        onClick={onOpen}
      />
    </ButtonWrapper>
  );

  const wrappedItems = useMemo(() => {
    return items.map((item, i) => (
      <EuiContextMenuItem key={i} onClick={closeMenuAndCall(item.onClick)}>
        {item.label}
      </EuiContextMenuItem>
    ));
  }, [items, closeMenuAndCall]);

  return (
    <LogEntryContextMenuContent>
      <AbsoluteWrapper>
        <EuiPopover closePopover={onClose} isOpen={isOpen} button={button} ownFocus={true}>
          <EuiContextMenuPanel items={wrappedItems} />
        </EuiPopover>
      </AbsoluteWrapper>
    </LogEntryContextMenuContent>
  );
};

const LogEntryContextMenuContent = euiStyled(LogEntryColumnContent)`
  overflow: hidden;
  user-select: none;
`;

const AbsoluteWrapper = euiStyled.div`
  position: absolute;
`;

const ButtonWrapper = euiStyled.div`
  background: ${(props) => props.theme.eui.euiColorPrimary};
  border-radius: 50%;
  padding: 4px;
  transform: translateY(-6px);
`;
