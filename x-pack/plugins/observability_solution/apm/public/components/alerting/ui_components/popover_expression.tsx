/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiExpression, EuiPopover } from '@elastic/eui';

type ExpressionColor = 'subdued' | 'primary' | 'success' | 'accent' | 'warning' | 'danger';
interface Props {
  title: React.ReactNode;
  value: React.ReactNode;
  children?: React.ReactNode;
  color?: ExpressionColor;
  dataTestSubj?: string;
}

export function PopoverExpression(props: Props) {
  const { title, value, children, color, dataTestSubj } = props;
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <EuiPopover
      isOpen={popoverOpen}
      anchorPosition="downLeft"
      closePopover={() => setPopoverOpen(false)}
      button={
        <EuiExpression
          data-test-subj={dataTestSubj}
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
