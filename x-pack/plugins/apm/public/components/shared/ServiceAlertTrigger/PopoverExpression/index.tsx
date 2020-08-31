/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiExpression, EuiPopover } from '@elastic/eui';

interface Props {
  title: React.ReactNode;
  value: React.ReactNode;
  children?: React.ReactNode;
}

export function PopoverExpression(props: Props) {
  const { title, value, children } = props;

  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <EuiPopover
      isOpen={popoverOpen}
      withTitle
      anchorPosition="downLeft"
      closePopover={() => setPopoverOpen(false)}
      button={
        <EuiExpression
          description={title}
          value={value}
          isActive={popoverOpen}
          onClick={() => setPopoverOpen(true)}
        />
      }
    >
      {children}
    </EuiPopover>
  );
}
