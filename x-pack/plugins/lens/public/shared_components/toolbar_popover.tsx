/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './toolbar_popover.scss';
import React, { useState } from 'react';
import { EuiFlexItem, EuiPopover, EuiIcon, EuiPopoverTitle, IconType } from '@elastic/eui';
import { EuiIconLegend } from '../assets/legend';
import { ToolbarButton, ToolbarButtonProps } from '../../../../../src/plugins/kibana_react/public';

const typeToIconMap: { [type: string]: string | IconType } = {
  legend: EuiIconLegend as IconType,
  labels: 'visText',
  values: 'number',
  list: 'list',
  visualOptions: 'brush',
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
   * Button group position
   */
  groupPosition?: ToolbarButtonProps['groupPosition'];
  buttonDataTestSubj?: string;
  panelClassName?: string;
  handleClose?: () => void;
}

export const ToolbarPopover: React.FunctionComponent<ToolbarPopoverProps> = ({
  children,
  title,
  type,
  isDisabled = false,
  groupPosition,
  buttonDataTestSubj,
  panelClassName = 'lnsVisToolbar__popover',
  handleClose,
}) => {
  const [open, setOpen] = useState(false);

  const iconType: string | IconType = typeof type === 'string' ? typeToIconMap[type] : type;

  return (
    <EuiFlexItem grow={false}>
      <EuiPopover
        panelClassName={panelClassName}
        ownFocus
        aria-label={title}
        button={
          <ToolbarButton
            fontWeight="normal"
            onClick={() => {
              setOpen(!open);
            }}
            title={title}
            hasArrow={false}
            isDisabled={isDisabled}
            groupPosition={groupPosition}
            dataTestSubj={buttonDataTestSubj}
          >
            <EuiIcon type={iconType} />
          </ToolbarButton>
        }
        isOpen={open}
        closePopover={() => {
          setOpen(false);
          handleClose?.();
        }}
        anchorPosition="downRight"
      >
        <EuiPopoverTitle>{title}</EuiPopoverTitle>
        {children}
      </EuiPopover>
    </EuiFlexItem>
  );
};
