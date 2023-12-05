/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, copyToClipboard, EuiTextTruncate } from '@elastic/eui';
import React, { ReactNode, useMemo, useState } from 'react';
import { ValuesType } from 'utility-types';
import {
  flyoutHoverActionFilterForText,
  flyoutHoverActionFilterOutText,
  flyoutHoverActionFilterForFieldPresentText,
  flyoutHoverActionToggleColumnText,
  flyoutHoverActionCopyToClipboardText,
} from '../translations';
import { useDiscoverActionsContext } from '../../../hooks/use_discover_action';
import { HoverActionPopover, HoverActionType } from './hover_popover_action';
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
  const filterForText = flyoutHoverActionFilterForText(value);
  const filterOutText = flyoutHoverActionFilterOutText(value);
  const actions = useDiscoverActionsContext();
  const [columnAdded, setColumnAdded] = useState(false);

  const hoverActions: HoverActionType[] = useMemo(
    () => [
      {
        id: 'addToFilterAction',
        tooltipContent: filterForText,
        iconType: 'plusInCircle',
        onClick: () => actions?.addFilter && actions.addFilter(field, value, '+'),
        display: true,
      },
      {
        id: 'removeFromFilterAction',
        tooltipContent: filterOutText,
        iconType: 'minusInCircle',
        onClick: () => actions?.addFilter && actions.addFilter(field, value, '-'),
        display: true,
      },
      {
        id: 'filterForFieldPresentAction',
        tooltipContent: flyoutHoverActionFilterForFieldPresentText,
        iconType: 'filter',
        onClick: () => actions?.addFilter && actions.addFilter('_exists_', field, '+'),
        display: true,
      },
      {
        id: 'toggleColumnAction',
        tooltipContent: flyoutHoverActionToggleColumnText,
        iconType: 'listAdd',
        onClick: () => {
          if (actions) {
            if (columnAdded) {
              actions?.removeColumn?.(field);
            } else {
              actions?.addColumn?.(field);
            }
            setColumnAdded(!columnAdded);
          }
        },
        display: true,
      },
      {
        id: 'copyToClipboardAction',
        tooltipContent: flyoutHoverActionCopyToClipboardText,
        iconType: 'copyClipboard',
        onClick: () => copyToClipboard(value as string),
        display: true,
      },
    ],
    [filterForText, filterOutText, actions, field, value, columnAdded]
  );

  return formattedValue ? (
    <EuiFlexGroup direction="column" gutterSize="none" {...props}>
      <EuiFlexItem>
        <EuiText color="subdued" size="xs">
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <HoverActionPopover actions={hoverActions} title={value as string}>
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
