/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiLinkButtonProps, EuiPopoverProps } from '@elastic/eui';
import { EuiIcon, EuiLink, EuiPopover, EuiPopoverTitle, EuiText } from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { useEffect } from 'react';
import { trackUiEvent } from '../lens_ui_telemetry/factory';
import './help_popover.scss';

export const HelpPopoverButton = ({
  children,
  onClick,
}: {
  children: string;
  onClick: EuiLinkButtonProps['onClick'];
}) => {
  return (
    <EuiText size="xs">
      <EuiLink onClick={onClick}>
        <EuiIcon className="lnsHelpPopover__buttonIcon" size="s" type="help" />

        {children}
      </EuiLink>
    </EuiText>
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
  useEffect(() => {
    if (isOpen) {
      trackUiEvent('open_help_popover');
    }
  }, [isOpen]);
  return (
    <EuiPopover
      anchorPosition={anchorPosition}
      button={button}
      className="lnsHelpPopover"
      closePopover={closePopover}
      isOpen={isOpen}
      ownFocus
      panelClassName="lnsHelpPopover__panel"
      panelPaddingSize="none"
    >
      {title && <EuiPopoverTitle paddingSize="m">{title}</EuiPopoverTitle>}

      <EuiText className="lnsHelpPopover__content" size="s">
        {children}
      </EuiText>
    </EuiPopover>
  );
};
