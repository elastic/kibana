/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';

interface PopoverTooltipProps {
  ariaLabel?: string;
  iconType?: string;
  children: React.ReactNode;
}

export function PopoverTooltip({
  ariaLabel,
  iconType = 'questionInCircle',
  children,
}: PopoverTooltipProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiPopover
      anchorPosition={'upCenter'}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      button={
        <EuiButtonIcon
          aria-label={ariaLabel}
          onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
            setIsPopoverOpen(!isPopoverOpen);
            event.stopPropagation();
          }}
          size="xs"
          color="primary"
          iconType={iconType}
          style={{ height: 'auto' }}
        />
      }
    >
      {children}
    </EuiPopover>
  );
}
