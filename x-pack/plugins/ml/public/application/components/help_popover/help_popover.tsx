/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import {
  EuiButtonIcon,
  EuiLinkButtonProps,
  EuiPopover,
  EuiPopoverProps,
  EuiPopoverTitle,
  EuiText,
} from '@elastic/eui';
import './help_popover.scss';

export const HelpPopoverButton = ({ onClick }: { onClick: EuiLinkButtonProps['onClick'] }) => {
  return (
    <EuiButtonIcon
      className="mlHelpPopover__buttonIcon"
      size="s"
      iconType="help"
      onClick={onClick}
    />
  );
};

export const HelpPopover = ({
  anchorPosition,
  button,
  children,
  closePopover,
  isOpen,
  title,
}: {
  anchorPosition?: EuiPopoverProps['anchorPosition'];
  button: EuiPopoverProps['button'];
  children: ReactNode;
  closePopover: EuiPopoverProps['closePopover'];
  isOpen: EuiPopoverProps['isOpen'];
  title?: string;
}) => {
  return (
    <EuiPopover
      anchorPosition={anchorPosition}
      button={button}
      className="mlHelpPopover"
      closePopover={closePopover}
      isOpen={isOpen}
      ownFocus
      panelClassName="mlHelpPopover__panel"
      panelPaddingSize="none"
    >
      {title && <EuiPopoverTitle paddingSize="s">{title}</EuiPopoverTitle>}

      <EuiText className="mlHelpPopover__content" size="s">
        {children}
      </EuiText>
    </EuiPopover>
  );
};
