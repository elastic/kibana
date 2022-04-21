/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiLinkButtonProps,
  EuiPopover,
  EuiPopoverProps,
  EuiPopoverTitle,
  EuiText,
} from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';

const PopoverContent = euiStyled(EuiText)`
  max-width: 480px;
  max-height: 40vh;
`;

export function HelpPopoverButton({
  buttonTextEnabled = false,
  onClick,
}: {
  buttonTextEnabled?: boolean;
  onClick: EuiLinkButtonProps['onClick'];
}) {
  const buttonText = i18n.translate('xpack.apm.helpPopover.ariaLabel', {
    defaultMessage: 'Help',
  });

  if (buttonTextEnabled) {
    return (
      <EuiButtonEmpty
        className="apmHelpPopover__buttonIcon"
        size="s"
        iconType="help"
        aria-label={buttonText}
        onClick={onClick}
      >
        {buttonText}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiButtonIcon
      className="apmHelpPopover__buttonIcon"
      size="s"
      iconType="help"
      aria-label={buttonText}
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
      closePopover={closePopover}
      isOpen={isOpen}
      panelPaddingSize="s"
      ownFocus
    >
      {title && <EuiPopoverTitle paddingSize="s">{title}</EuiPopoverTitle>}

      <PopoverContent size="s">{children}</PopoverContent>
    </EuiPopover>
  );
}
