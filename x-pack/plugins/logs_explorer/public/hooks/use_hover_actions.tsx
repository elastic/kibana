/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import { ValuesType } from 'utility-types';
import { copyToClipboard, IconType } from '@elastic/eui';
import {
  flyoutHoverActionCopyToClipboardText,
  flyoutHoverActionFilterForFieldPresentText,
  flyoutHoverActionFilterForText,
  flyoutHoverActionFilterOutText,
  flyoutHoverActionToggleColumnText,
} from '../components/flyout_detail/translations';
import { useDiscoverActionsContext } from './use_discover_action';
import { LogDocument } from '../components/flyout_detail';

interface HoverActionProps {
  field: string;
  value: ValuesType<LogDocument['flattened']>;
}

export interface HoverActionType {
  id: string;
  tooltipContent: string;
  iconType: IconType;
  onClick: () => void;
  display: boolean;
}

export const useHoverActions = ({ field, value }: HoverActionProps): HoverActionType[] => {
  const filterForText = flyoutHoverActionFilterForText(value);
  const filterOutText = flyoutHoverActionFilterOutText(value);
  const actions = useDiscoverActionsContext();
  const [columnAdded, setColumnAdded] = useState<boolean>(false);

  return useMemo(
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
};
