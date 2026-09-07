/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiLinkButtonProps, EuiPopoverProps } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import styled from '@emotion/styled';

const PopoverContent = styled(EuiText)`
  max-width: 480px;
  max-height: 40vh;
`;

export function HelpPopoverButton({
  buttonTextEnabled = false,
  onClick,
  tooltipContent,
}: {
  buttonTextEnabled?: boolean;
  onClick: EuiLinkButtonProps['onClick'];
  tooltipContent?: ReactNode;
}) {
  const buttonText = i18n.translate('xpack.apm.helpPopover.ariaLabel', {
    defaultMessage: 'Help',
  });

  if (buttonTextEnabled) {
    return (
      <EuiButtonEmpty
        data-test-subj="apmHelpPopoverButtonButton"
        className="apmHelpPopover__buttonIcon"
        iconType="question"
        aria-label={buttonText}
        onClick={onClick}
      >
        {buttonText}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiToolTip content={tooltipContent ?? buttonText} disableScreenReaderOutput>
      <EuiButtonIcon
        data-test-subj="apmHelpPopoverButtonButton"
        className="apmHelpPopover__buttonIcon"
        iconType="question"
        aria-label={buttonText}
        onClick={onClick}
      />
    </EuiToolTip>
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
  const popoverTitleId = useGeneratedHtmlId();

  return (
    <EuiPopover
      anchorPosition={anchorPosition}
      button={button}
      closePopover={closePopover}
      isOpen={isOpen}
      panelPaddingSize="s"
      ownFocus
      aria-labelledby={title ? popoverTitleId : undefined}
      aria-label={
        title
          ? undefined
          : i18n.translate('xpack.apm.helpPopover.popoverAriaLabel', {
              defaultMessage: 'Help',
            })
      }
    >
      {title && (
        <EuiPopoverTitle id={popoverTitleId} paddingSize="s">
          {title}
        </EuiPopoverTitle>
      )}

      <PopoverContent size="s">{children}</PopoverContent>
    </EuiPopover>
  );
}
