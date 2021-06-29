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

export function HelpPopoverButton({
  onClick,
}: {
  onClick: EuiLinkButtonProps['onClick'];
}) {
  return (
    <EuiButtonIcon
      className="apmHelpPopover__buttonIcon"
      size="s"
      iconType="help"
      aria-label="Help"
      onClick={onClick}
    />
  );
}

export function HelpPopover({
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
}) {
  return (
    <EuiPopover
      anchorPosition={anchorPosition}
      button={button}
      className="apmHelpPopover"
      closePopover={closePopover}
      isOpen={isOpen}
      ownFocus
      panelClassName="apmHelpPopover__panel"
      panelPaddingSize="none"
    >
      {title && <EuiPopoverTitle paddingSize="s">{title}</EuiPopoverTitle>}

      <EuiText className="apmHelpPopover__content" size="s">
        {children}
      </EuiText>
    </EuiPopover>
  );
}
