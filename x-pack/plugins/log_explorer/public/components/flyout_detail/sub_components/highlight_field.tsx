/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText, EuiTextTruncate } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { ValuesType } from 'utility-types';
import { EcsFlat } from '@kbn/ecs';
import { FieldIcon } from '@kbn/react-field';
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
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="xs">
              {label}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FieldDescription fieldName={field} />
          </EuiFlexItem>
        </EuiFlexGroup>
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

function FieldDescription({ fieldName }: { fieldName: string }) {
  const { short, type } = EcsFlat[fieldName as keyof typeof EcsFlat];

  if (!short) return null;

  const title = (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      {type && (
        <EuiFlexItem grow={false}>
          <FieldIcon type={type} size="s" />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>{fieldName}</EuiFlexItem>
    </EuiFlexGroup>
  );

  return <EuiIconTip title={title} content={short} color="subdued" />;
}
