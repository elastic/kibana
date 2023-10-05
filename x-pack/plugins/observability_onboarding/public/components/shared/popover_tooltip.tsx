/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import React, { useState } from 'react';

interface PopoverTooltipProps {
  ariaLabel?: string;
  iconType?: string;
  title?: string;
  children: React.ReactNode;
  dataTestSubj: string;
}

export function PopoverTooltip({
  ariaLabel,
  iconType = 'iInCircle',
  title,
  children,
  dataTestSubj,
}: PopoverTooltipProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiPopover
      panelPaddingSize="s"
      anchorPosition={'upCenter'}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      style={{ margin: '-5px 0 0 -5px' }}
      button={
        <EuiButtonIcon
          data-test-subj={dataTestSubj}
          aria-label={ariaLabel}
          onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
            setIsPopoverOpen(!isPopoverOpen);
            event.stopPropagation();
          }}
          size="xs"
          color="primary"
          iconType={iconType}
        />
      }
    >
      {title && <EuiPopoverTitle>{title}</EuiPopoverTitle>}
      {children}
    </EuiPopover>
  );
}
