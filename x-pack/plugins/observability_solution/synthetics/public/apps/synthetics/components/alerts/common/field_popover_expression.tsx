/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { EuiExpression, EuiPopover } from '@elastic/eui';
import { Suggestion } from '../hooks/use_fetch_synthetics_suggestions';

type ExpressionColor = 'subdued' | 'primary' | 'success' | 'accent' | 'warning' | 'danger';
interface Props {
  title?: ReactNode;
  value: ReactNode;
  children?: ReactNode;
  color?: ExpressionColor;
  selectedField?: string;
  fieldName: string;
  setSelectedField: (value?: string) => void;
  suggestions?: Suggestion[];
}

export function FieldPopoverExpression({
  title,
  value,
  children,
  color,
  selectedField,
  fieldName,
  setSelectedField,
  suggestions,
}: Props) {
  const isPopoverOpen = selectedField === fieldName;

  const label = suggestions?.find((suggestion) => suggestion.value === selectedField)?.label;

  const closePopover = () => setSelectedField(selectedField === fieldName ? undefined : fieldName);
  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      anchorPosition="downLeft"
      closePopover={closePopover}
      button={
        <EuiExpression
          description={title}
          value={label}
          isActive={Boolean(selectedField)}
          color={color}
          onClick={closePopover}
        />
      }
      repositionOnScroll
    >
      <div style={{ width: 300 }}>{children}</div>
    </EuiPopover>
  );
}
