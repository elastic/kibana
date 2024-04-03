/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import type { EuiIconProps, IconColor } from '@elastic/eui';
import { EuiIcon, EuiPopover, keys } from '@elastic/eui';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';

interface PopoverTooltipProps {
  columnName: string;
  children: React.ReactNode;
  anchorColor?: IconColor;
}

/**
 * Table column tooltip component utilizing EuiPopover for rich content like documentation links
 * @param columnName string Name of column to use as aria-label of button
 * @param children React.ReactNode of content to display in popover tooltip
 */
const PopoverTooltipComponent = ({
  columnName,
  children,
  anchorColor = 'primary',
}: PopoverTooltipProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onClick: EuiIconProps['onClick'] = useCallback(
    (event) => {
      setIsPopoverOpen(!isPopoverOpen);
      event.stopPropagation();
    },
    [isPopoverOpen]
  );

  const onKeyDown: EuiIconProps['onKeyDown'] = useCallback(
    (event) => {
      if (keys.ENTER === event.key) {
        setIsPopoverOpen(!isPopoverOpen);
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [isPopoverOpen]
  );

  return (
    <EuiPopover
      anchorPosition={'upCenter'}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      button={
        <EuiIcon
          aria-label={i18n.POPOVER_TOOLTIP_ARIA_LABEL(columnName)}
          tabIndex={0}
          onClick={onClick}
          onKeyDown={onKeyDown}
          color={anchorColor}
          type="questionInCircle"
        />
      }
    >
      {children}
    </EuiPopover>
  );
};

export const PopoverTooltip = React.memo(PopoverTooltipComponent);

PopoverTooltip.displayName = 'PopoverTooltip';
