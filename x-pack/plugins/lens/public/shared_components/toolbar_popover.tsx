/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { EuiFlexItem, EuiPopover, EuiIcon, EuiPopoverTitle, IconType } from '@elastic/eui';
import { ToolbarButton, ToolbarButtonProps } from '../toolbar_button';
import { EuiIconLegend } from '../assets/legend';

const typeToIconMap: { [type: string]: string | IconType } = {
  legend: EuiIconLegend as IconType,
  values: 'visText',
};

export interface ToolbarPopoverProps {
  /**
   * Determines popover title
   */
  title: string;
  /**
   * Determines the button icon
   */
  type: 'legend' | 'values' | IconType;
  /**
   * Determines if the popover is disabled
   */
  isDisabled?: boolean;
  /**
   * Is used to pass the popover state to the parent component
   */
  handlePopoverState?: (open: boolean) => void;
  groupPosition?: ToolbarButtonProps['groupPosition'];
}

export const ToolbarPopover: React.FunctionComponent<ToolbarPopoverProps> = ({
  children,
  title,
  type,
  isDisabled = false,
  handlePopoverState,
  groupPosition,
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (handlePopoverState) {
      handlePopoverState(open);
    }
  }, [open, handlePopoverState]);

  const iconType: string | IconType = typeof type === 'string' ? typeToIconMap[type] : type;

  return (
    <EuiFlexItem grow={false}>
      <EuiPopover
        panelClassName="lnsXyToolbar__popover"
        ownFocus
        button={
          <ToolbarButton
            fontWeight="normal"
            onClick={() => {
              setOpen(!open);
            }}
            hasArrow={false}
            isDisabled={isDisabled}
            groupPosition={groupPosition}
          >
            <EuiIcon type={iconType} />
          </ToolbarButton>
        }
        isOpen={open}
        closePopover={() => {
          setOpen(false);
        }}
        anchorPosition="downRight"
      >
        <EuiPopoverTitle>{title}</EuiPopoverTitle>
        {children}
      </EuiPopover>
    </EuiFlexItem>
  );
};
