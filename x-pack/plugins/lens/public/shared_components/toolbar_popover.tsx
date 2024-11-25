/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './toolbar_popover.scss';
import React, { PropsWithChildren, useState } from 'react';
import { EuiFlexItem, EuiPopover, EuiPopoverProps, EuiPopoverTitle, IconType } from '@elastic/eui';
import { ToolbarButton, ToolbarButtonProps } from '@kbn/shared-ux-button-toolbar';
import { EuiIconLegend } from '@kbn/chart-icons';

const typeToIconMap: { [type: string]: string | IconType } = {
  legend: EuiIconLegend as IconType,
  values: 'number',
  list: 'list',
  visualOptions: 'brush',
  titlesAndText: 'visText',
};

export type ToolbarPopoverProps = Partial<EuiPopoverProps> & {
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
};

export const ToolbarPopover: React.FC<PropsWithChildren<ToolbarPopoverProps>> = ({
  children,
  title,
  type,
  isDisabled = false,
  groupPosition,
  buttonDataTestSubj,
  handleClose,
  panelClassName = 'lnsVisToolbar__popover',
  ...euiPopoverProps
}) => {
  const [isOpen, setIsOpen] = useState(false);

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
              setIsOpen(!isOpen);
            }}
            label={title}
            aria-label={title}
            isDisabled={isDisabled}
            groupPosition={groupPosition}
            data-test-subj={buttonDataTestSubj}
          />
        }
        isOpen={isOpen}
        closePopover={() => {
          setIsOpen(false);
          handleClose?.();
        }}
        anchorPosition="downRight"
        panelPaddingSize="s"
        {...euiPopoverProps}
      >
        <EuiPopoverTitle data-test-subj={`${euiPopoverProps['data-test-subj']}_title`}>
          {title}
        </EuiPopoverTitle>
        {children}
      </EuiPopover>
    </EuiFlexItem>
  );
};
