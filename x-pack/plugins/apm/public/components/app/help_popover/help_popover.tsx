/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiLinkButtonProps,
  EuiPopover,
  EuiPopoverProps,
  EuiPopoverTitle,
  EuiText,
} from '@elastic/eui';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';

const PopoverContent = euiStyled(EuiText)`
  max-width: 480px;
  max-height: 40vh;
`;

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
      aria-label={i18n.translate('xpack.apm.helpPopover.ariaLabel', {
        defaultMessage: 'Help',
      })}
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
