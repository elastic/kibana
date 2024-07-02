/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, ReactNode } from 'react';
import { EuiExpression, EuiPopover } from '@elastic/eui';

type ExpressionColor = 'subdued' | 'primary' | 'success' | 'accent' | 'warning' | 'danger';
interface Props {
  title?: ReactNode;
  value: ReactNode;
  children?: ReactNode;
  color?: ExpressionColor;
}

export function PopoverExpression(props: Props) {
  const { title, value, children, color } = props;
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <EuiPopover
      isOpen={popoverOpen}
      anchorPosition="downLeft"
      closePopover={() => setPopoverOpen(false)}
      button={
        <EuiExpression
          description={title}
          value={value}
          isActive={popoverOpen}
          color={color}
          onClick={() => setPopoverOpen((state) => !state)}
        />
      }
      repositionOnScroll
    >
      {children}
    </EuiPopover>
  );
}
