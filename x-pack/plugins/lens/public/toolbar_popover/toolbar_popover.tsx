/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFlexItem, EuiPopover, EuiIcon, EuiPopoverTitle } from '@elastic/eui';
import { ToolbarButton } from '../toolbar_button';

export interface ToolbarPopoverProps {
  /**
   * Determines popover title
   */
  title?: string;
  /**
   * Determines the button icon
   */
  icon?: string;
  /**
   * Determines if the popover is disabled
   */
  isDisabled?: boolean;
}

export const ToolbarPopover: React.FunctionComponent<ToolbarPopoverProps> = ({
  children,
  title,
  icon = 'beaker',
  isDisabled = false,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <EuiFlexItem grow={false}>
      <EuiPopover
        panelClassName="lnsXyToolbar_left__popover"
        ownFocus
        button={
          <ToolbarButton
            fontWeight="normal"
            onClick={() => {
              setOpen(!open);
            }}
            hasArrow={false}
            isDisabled={isDisabled}
          >
            <EuiIcon type={icon} />
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
