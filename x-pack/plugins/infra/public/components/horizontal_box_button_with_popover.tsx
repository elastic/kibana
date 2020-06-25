/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonIcon,
  ButtonSize,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';
import { euiStyled } from '../../../observability/public';

interface Props {
  buttonSize?: ButtonSize;
  ariaLabel?: string;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
  menuItems: Array<{
    key: string;
    label: string;
    onClick: () => void;
  }>;
}

export const HorizontalBoxButtonWithPopoverMenu: React.FC<Props> = ({
  buttonSize,
  ariaLabel,
  onMenuOpen,
  onMenuClose,
  menuItems,
}) => {
  const [isOpen, setOpenState] = useState(false);

  const handleOpenMenu = useCallback(() => {
    setOpenState(true);
    if (onMenuOpen) {
      onMenuOpen();
    }
  }, [setOpenState, onMenuOpen]);

  const handleCloseMenu = useCallback(() => {
    setOpenState(false);
    if (onMenuClose) {
      onMenuClose();
    }
  }, [setOpenState, onMenuClose]);

  const button = (
    <ButtonWrapper>
      <EuiButtonIcon
        aria-label={ariaLabel}
        color="ghost"
        iconType="boxesHorizontal"
        onClick={handleOpenMenu}
        size={buttonSize}
      />
    </ButtonWrapper>
  );

  const items = menuItems.map((item) => {
    return (
      <EuiContextMenuItem
        key={item.key}
        onClick={() => {
          handleCloseMenu();
          item.onClick();
        }}
      >
        {item.label}
      </EuiContextMenuItem>
    );
  });
  return (
    <EuiPopover closePopover={handleCloseMenu} isOpen={isOpen} button={button} ownFocus={true}>
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
};

const ButtonWrapper = euiStyled.div`
  background: ${(props) => props.theme.eui.euiColorPrimary};
  border-radius: 50%;
  padding: 4px;
  transform: translateY(-6px);
`;
