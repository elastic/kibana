/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiButtonIconPropsForButton, EuiToolTip } from '@elastic/eui';
import { TooltipWithKeyboardShortcut } from '../../accessibility';
import { getAdditionalScreenReaderOnlyContext } from '../utils';
import { FILTER_FOR_VALUE_KEYBOARD_SHORTCUT } from '../keyboard_shortcut_constants';

export const FILTER_FOR_VALUE = i18n.translate(
  'xpack.securitySolution.hoverActions.filterForValue',
  {
    defaultMessage: 'Filter for value',
  }
);

interface Props {
  defaultFocusedButtonRef: EuiButtonIconPropsForButton['buttonRef'];
  field: string;
  onClick?: () => void;
  ownFocus: boolean;
  value?: string[] | string | null;
}

/** Returns a value for the `disabled` prop of `EuiFocusTrap` */

export const FilterForValueButton: React.FC<Props> = React.memo(
  ({ defaultFocusedButtonRef, field, onClick, ownFocus, value }) => {
    return (
      <EuiToolTip
        content={
          <TooltipWithKeyboardShortcut
            additionalScreenReaderOnlyContext={getAdditionalScreenReaderOnlyContext({
              field,
              value,
            })}
            content={FILTER_FOR_VALUE}
            shortcut={FILTER_FOR_VALUE_KEYBOARD_SHORTCUT}
            showShortcut={ownFocus}
          />
        }
      >
        <EuiButtonIcon
          aria-label={FILTER_FOR_VALUE}
          buttonRef={defaultFocusedButtonRef}
          className="securitySolution__hoverActionButton"
          data-test-subj="filter-for-value"
          iconSize="s"
          iconType="plusInCircle"
          onClick={onClick}
        />
      </EuiToolTip>
    );
  }
);

FilterForValueButton.displayName = 'FilterForValueButton';
