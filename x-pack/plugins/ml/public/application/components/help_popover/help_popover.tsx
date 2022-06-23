/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiLinkButtonProps,
  EuiPopover,
  EuiPopoverProps,
  EuiPopoverTitle,
  EuiText,
} from '@elastic/eui';
import './help_popover.scss';

export const HelpPopoverButton: FC<{ onClick: EuiLinkButtonProps['onClick'] }> = ({ onClick }) => {
  return (
    <EuiButtonIcon
      className="mlHelpPopover__buttonIcon"
      size="s"
      iconType="help"
      aria-label={i18n.translate('xpack.ml.helpPopover.ariaLabel', {
        defaultMessage: 'Help',
      })}
      onClick={onClick}
    />
  );
};

interface HelpPopoverProps {
  anchorPosition?: EuiPopoverProps['anchorPosition'];
  title?: string;
}

export const HelpPopover: FC<HelpPopoverProps> = ({ anchorPosition, children, title }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiPopover
      anchorPosition={anchorPosition}
      button={<HelpPopoverButton onClick={setIsPopoverOpen.bind(null, !isPopoverOpen)} />}
      className="mlHelpPopover"
      closePopover={setIsPopoverOpen.bind(null, false)}
      isOpen={isPopoverOpen}
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
