/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { EuiContextMenuItem, EuiButtonEmpty, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { stopPropagationAndPreventDefault } from '../../../../common/utils/accessibility';
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

export interface ColumnToggleProps extends HoverActionComponentProps {
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon | typeof EuiContextMenuItem;
  isDisabled: boolean;
  isObjectArray: boolean;
  toggleColumn: (column: ColumnHeaderOptions) => void;
}

const ColumnToggleButton: React.FC<ColumnToggleProps> = React.memo(
  ({
    Component,
    defaultFocusedButtonRef,
    field,
    isDisabled,
    isObjectArray,
    keyboardEvent,
    ownFocus,
    onClick,
    showTooltip = false,
    toggleColumn,
    value,
  }) => {
    const label = isObjectArray ? NESTED_COLUMN(field) : COLUMN_TOGGLE(field);

    const handleToggleColumn = useCallback(() => {
      toggleColumn({
        columnHeaderType: defaultColumnHeaderType,
        id: field,
        initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
      });
      if (onClick != null) {
        onClick();
      }
    }, [onClick, field, toggleColumn]);

    useEffect(() => {
      if (!ownFocus) {
        return;
      }
      if (keyboardEvent?.key === COLUMN_TOGGLE_KEYBOARD_SHORTCUT) {
        stopPropagationAndPreventDefault(keyboardEvent);
        handleToggleColumn();
      }
    }, [handleToggleColumn, keyboardEvent, ownFocus]);

    const button = useMemo(
      () =>
        Component ? (
          <Component
            aria-label={label}
            data-test-subj={`toggle-field-${field}`}
            icon="listAdd"
            iconType="listAdd"
            onClick={handleToggleColumn}
            title={label}
          >
            {label}
          </Component>
        ) : (
          <EuiButtonIcon
            aria-label={label}
            buttonRef={defaultFocusedButtonRef}
            className="timelines__hoverActionButton"
            data-test-subj={`toggle-field-${field}`}
            data-colindex={1}
            disabled={isDisabled}
            id={field}
            iconSize="s"
            iconType="listAdd"
            onClick={handleToggleColumn}
          />
        ),
      [Component, defaultFocusedButtonRef, field, handleToggleColumn, isDisabled, label]
    );

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
        {button}
      </EuiToolTip>
    ) : (
      button
    );
  }
);

ColumnToggleButton.displayName = 'ColumnToggleButton';

// eslint-disable-next-line import/no-default-export
export { ColumnToggleButton as default };
