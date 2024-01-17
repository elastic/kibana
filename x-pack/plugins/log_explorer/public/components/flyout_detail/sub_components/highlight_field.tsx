/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTextTruncate } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { dynamic } from '../../../utils/dynamic';
import { HoverActionPopover } from './hover_popover_action';

const HighlightFieldDescription = dynamic(() => import('./highlight_field_description'));

interface HighlightFieldProps {
  field: string;
  formattedValue: string;
  icon?: ReactNode;
  label: string | ReactNode;
  value?: string;
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
  return formattedValue && value ? (
    <EuiFlexGroup direction="column" gutterSize="none" {...props}>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="xs">
              {label}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <HighlightFieldDescription fieldName={field} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <HoverActionPopover title={value} value={value} field={field}>
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
