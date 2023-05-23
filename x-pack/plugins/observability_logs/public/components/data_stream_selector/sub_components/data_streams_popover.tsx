/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiPopover, EuiPopoverProps, useIsWithinBreakpoints } from '@elastic/eui';
import { POPOVER_ID } from '../constants';
import { getPopoverButtonStyles } from '../utils';

interface DataStreamsPopoverProps extends Omit<EuiPopoverProps, 'button'> {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

export const DataStreamsPopover = ({ title, onClick, ...props }: DataStreamsPopoverProps) => {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);

  const buttonStyles = getPopoverButtonStyles({ fullWidth: isMobile });

  return (
    <EuiPopover
      id={POPOVER_ID}
      button={
        <EuiButton
          css={buttonStyles}
          iconType="arrowDown"
          iconSide="right"
          onClick={onClick}
          fullWidth={isMobile}
        >
          {title}
        </EuiButton>
      }
      panelPaddingSize="none"
      buffer={8}
      {...(isMobile && { display: 'block' })}
      {...props}
    />
  );
};
