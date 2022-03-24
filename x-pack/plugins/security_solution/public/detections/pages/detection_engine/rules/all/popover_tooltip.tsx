/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiButtonIcon } from '@elastic/eui';
import * as i18n from '../translations';

interface PopoverTooltipProps {
  columnName: string;
  children: React.ReactNode;
}

/**
 * Table column tooltip component utilizing EuiPopover for rich content like documentation links
 * @param columnName string Name of column to use as aria-label of button
 * @param children React.ReactNode of content to display in popover tooltip
 */
const PopoverTooltipComponent = ({ columnName, children }: PopoverTooltipProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiPopover
      anchorPosition={'upCenter'}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      button={
        <EuiButtonIcon
          aria-label={i18n.POPOVER_TOOLTIP_ARIA_LABEL(columnName)}
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          size="xs"
          color="primary"
          iconType="questionInCircle"
          style={{ height: 'auto' }}
        />
      }
    >
      {children}
    </EuiPopover>
  );
};

export const PopoverTooltip = React.memo(PopoverTooltipComponent);

PopoverTooltip.displayName = 'PopoverTooltip';
