/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTextTruncate } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { ValuesType } from 'utility-types';
import { HoverActionPopover } from './hover_popover_action';
import { LogDocument } from '../types';

interface HighlightFieldProps {
  field: string;
  formattedValue: string;
  icon?: ReactNode;
  label: string | ReactNode;
  value: ValuesType<LogDocument['flattened']>;
  width: number;
}

export function HighlightField({
  field,
  formattedValue,
  icon,
  label,
  value,
  width,
  ...props
}: HighlightFieldProps) {
  return formattedValue ? (
    <EuiFlexGroup direction="column" gutterSize="none" {...props}>
      <EuiFlexItem>
        <EuiText color="subdued" size="xs">
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <HoverActionPopover title={value as string} value={value} field={field}>
          <EuiFlexGroup
            responsive={false}
            alignItems="center"
            justifyContent="flexStart"
            gutterSize="xs"
          >
            {icon && <EuiFlexItem grow={false}>{icon}</EuiFlexItem>}
            <EuiFlexItem grow={false}>
              <EuiTextTruncate text={formattedValue} truncation="end" width={width}>
                {(truncatedText: string) => (
                  <EuiText
                    size="s"
                    // Value returned from formatFieldValue is always sanitized
                    dangerouslySetInnerHTML={{ __html: truncatedText }}
                  />
                )}
              </EuiTextTruncate>
            </EuiFlexItem>
          </EuiFlexGroup>
        </HoverActionPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
}
