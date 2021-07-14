/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TooltipWithKeyboardShortcut } from '../../accessibility';
import { getAdditionalScreenReaderOnlyContext } from '../utils';
import { TOGGLE_FIELD_COLUMN_KEYBOARD_SHORTCUT } from '../keyboard_shortcut_constants';

export const TOGGLE_COLUMN = (field: string) =>
  i18n.translate('xpack.securitySolution.hoverActions.toggleColumnLabel', {
    values: { field },
    defaultMessage: 'Toggle {field} column in table',
  });

export const NESTED_COLUMN = (field: string) =>
  i18n.translate('xpack.securitySolution.hoverActions.toggleNestedColumnLabel', {
    values: { field },
    defaultMessage:
      'The {field} field is an object, and is broken down into nested fields which can be added as columns',
  });

interface Props {
  field: string;
  isDisabled: boolean;
  isObjectArray: boolean;
  onClick: () => void;
  ownFocus: boolean;
  value?: string[] | string | null;
}

export const ToggleColumnButton: React.FC<Props> = React.memo(
  ({ field, isDisabled, isObjectArray, onClick, ownFocus, value }) => {
    const label = isObjectArray ? NESTED_COLUMN(field) : TOGGLE_COLUMN(field);

    return (
      <EuiToolTip
        content={
          <TooltipWithKeyboardShortcut
            additionalScreenReaderOnlyContext={getAdditionalScreenReaderOnlyContext({
              field,
              value,
            })}
            content={label}
            shortcut={TOGGLE_FIELD_COLUMN_KEYBOARD_SHORTCUT}
            showShortcut={ownFocus}
          />
        }
      >
        <EuiButtonIcon
          aria-label={label}
          className="securitySolution__hoverActionButton"
          data-test-subj={`toggle-field-${field}`}
          data-colindex={1}
          disabled={isDisabled}
          id={field}
          iconSize="s"
          iconType="listAdd"
          onClick={onClick}
        />
      </EuiToolTip>
    );
  }
);

ToggleColumnButton.displayName = 'ToggleColumnButton';
