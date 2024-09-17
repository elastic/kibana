/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { EuiExpression, EuiPopover } from '@elastic/eui';
import { allOptionText } from './fields';
import { Suggestion } from '../hooks/use_fetch_synthetics_suggestions';

type ExpressionColor = 'subdued' | 'primary' | 'success' | 'accent' | 'warning' | 'danger';
interface Props {
  title?: ReactNode;
  value?: string[];
  children?: ReactNode;
  color?: ExpressionColor;
  selectedField?: string;
  fieldName: string;
  setSelectedField: (value?: string) => void;
  allSuggestions?: Record<string, Suggestion[]>;
}

export function FieldPopoverExpression({
  title,
  value,
  children,
  color,
  selectedField,
  fieldName,
  setSelectedField,
  allSuggestions,
}: Props) {
  const isPopoverOpen = selectedField === fieldName;

  const suggestions = allSuggestions?.[fieldName];

  const label = value
    ? suggestions
        ?.filter((suggestion) => value.includes(suggestion.value))
        ?.map((suggestion) => suggestion.label)
        .join(', ')
    : allOptionText;

  const closePopover = () => setSelectedField(selectedField === fieldName ? undefined : fieldName);
  return (
    <span>
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
    </span>
  );
}
