/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './toolbar_popover.scss';
import React, { useState } from 'react';
import { EuiFlexItem, EuiPopover, EuiPopoverTitle, IconType } from '@elastic/eui';
import { ToolbarButton, ToolbarButtonProps } from '@kbn/shared-ux-button-toolbar';
import { EuiIconLegend } from '@kbn/chart-icons';

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
  groupPosition?: ToolbarButtonProps<'iconButton'>['groupPosition'];
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
            as={'iconButton'}
            iconType={iconType}
            onClick={() => {
              setOpen(!open);
            }}
            label={title}
            aria-label={title}
            isDisabled={isDisabled}
            groupPosition={groupPosition}
            data-test-subj={buttonDataTestSubj}
          />
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
