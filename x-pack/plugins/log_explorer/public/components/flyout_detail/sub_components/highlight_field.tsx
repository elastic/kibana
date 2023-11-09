/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React, { ReactNode, useMemo } from 'react';
import { HoverAction, HoverActionType } from './hover_action';
import { flyoutHoverActionFilterForText, flyoutHoverActionFilterOutText } from '../translations';
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
    ],
    [actions, field, value, filterForText, filterOutText]
  );
  return formattedValue ? (
    <EuiFlexGroup direction="column" gutterSize="none" data-test-subj={dataTestSubj}>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="xs" grow={false}>
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <HoverAction displayText={formattedValue} actions={hoverActions} width={width} />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
}
