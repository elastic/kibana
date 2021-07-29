/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TooltipWithKeyboardShortcut } from '../../tooltip_with_keyboard_shortcut';
import { getAdditionalScreenReaderOnlyContext } from '../utils';
import { defaultColumnHeaderType } from '../../t_grid/body/column_headers/default_headers';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../t_grid/body/constants';
import { ColumnHeaderOptions } from '../../../../common/types/timeline';
import { HoverActionComponentProps } from './types';

export const COLUMN_TOGGLE = (field: string) =>
  i18n.translate('xpack.timelines.hoverActions.columnToggleLabel', {
    values: { field },
    defaultMessage: 'Toggle {field} column in table',
  });

export const NESTED_COLUMN = (field: string) =>
  i18n.translate('xpack.timelines.hoverActions.nestedColumnToggleLabel', {
    values: { field },
    defaultMessage:
      'The {field} field is an object, and is broken down into nested fields which can be added as columns',
  });

export const COLUMN_TOGGLE_KEYBOARD_SHORTCUT = 'i';

export interface ColumnToggleFnArgs {
  toggleColumn: (column: ColumnHeaderOptions) => void;
  field: string;
}

export const columnToggleFn = ({ toggleColumn, field }: ColumnToggleFnArgs): void => {
  return toggleColumn({
    columnHeaderType: defaultColumnHeaderType,
    id: field,
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  });
};

export interface ColumnToggleProps extends HoverActionComponentProps {
  isDisabled: boolean;
  isObjectArray: boolean;
}

export const ColumnToggleButton: React.FC<ColumnToggleProps> = React.memo(
  ({ field, isDisabled, isObjectArray, onClick, ownFocus, showTooltip = false, value }) => {
    const label = isObjectArray ? NESTED_COLUMN(field) : COLUMN_TOGGLE(field);

    return showTooltip ? (
      <EuiToolTip
        content={
          <TooltipWithKeyboardShortcut
            additionalScreenReaderOnlyContext={getAdditionalScreenReaderOnlyContext({
              field,
              value,
            })}
            content={label}
            shortcut={COLUMN_TOGGLE_KEYBOARD_SHORTCUT}
            showShortcut={ownFocus}
          />
        }
      >
        <EuiButtonIcon
          aria-label={label}
          className="timelines__hoverActionButton"
          data-test-subj={`toggle-field-${field}`}
          data-colindex={1}
          disabled={isDisabled}
          id={field}
          iconSize="s"
          iconType="listAdd"
          onClick={onClick}
        />
      </EuiToolTip>
    ) : (
      <EuiButtonIcon
        aria-label={label}
        className="timelines__hoverActionButton"
        data-test-subj={`toggle-field-${field}`}
        data-colindex={1}
        disabled={isDisabled}
        id={field}
        iconSize="s"
        iconType="listAdd"
        onClick={onClick}
      />
    );
  }
);

ColumnToggleButton.displayName = 'ColumnToggleButton';
