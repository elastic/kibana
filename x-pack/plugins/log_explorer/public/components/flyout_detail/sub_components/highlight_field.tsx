/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, copyToClipboard } from '@elastic/eui';
import React, { ReactNode, useMemo, useState } from 'react';
import { HoverAction, HoverActionType } from './hover_action';
import {
  flyoutHoverActionFilterForText,
  flyoutHoverActionFilterOutText,
  flyoutHoverActionFilterForFieldPresentText,
  flyoutHoverActionToggleColumnText,
  flyoutHoverActionCopyToClipboardText,
} from '../translations';
import { useDiscoverActionsContext } from '../../../hooks/use_discover_action';

interface HighlightFieldProps {
  label: string | ReactNode;
  field: string;
  value: unknown;
  formattedValue: string;
  dataTestSubj: string;
  width: number;
}

export function HighlightField({
  label,
  field,
  value,
  formattedValue,
  dataTestSubj,
  width,
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
    <EuiFlexGroup direction="column" gutterSize="none" data-test-subj={dataTestSubj}>
      <EuiFlexItem>
        <EuiText color="subdued" size="xs">
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <HoverAction displayText={formattedValue} actions={hoverActions} width={width} />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
}
