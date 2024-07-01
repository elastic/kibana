/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { EuiExpression, EuiPopover } from '@elastic/eui';

type ExpressionColor = 'subdued' | 'primary' | 'success' | 'accent' | 'warning' | 'danger';
interface Props {
  title?: ReactNode;
  value: ReactNode;
  children?: ReactNode;
  color?: ExpressionColor;
  selectedField?: string;
  fieldName: string;
  setSelectedField: (value?: string) => void;
}

export function FieldPopoverExpression({
  title,
  value,
  children,
  color,
  selectedField,
  fieldName,
  setSelectedField,
}: Props) {
  const isPopoverOpen = selectedField === fieldName;

  const closePopover = () => setSelectedField(selectedField === fieldName ? undefined : fieldName);
  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      anchorPosition="downLeft"
      closePopover={closePopover}
      button={
        <EuiExpression
          description={title}
          value={value}
          isActive={Boolean(selectedField)}
          color={color}
          onClick={closePopover}
        />
      }
      repositionOnScroll
    >
      {children}
    </EuiPopover>
  );
}
