/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { TooltipWithKeyboardShortcut } from '../../accessibility';
import { getAdditionalScreenReaderOnlyContext } from '../utils';
import { FILTER_OUT_VALUE_KEYBOARD_SHORTCUT } from '../keyboard_shortcut_constants';

export const FILTER_OUT_VALUE = i18n.translate(
  'xpack.securitySolution.hoverActions.filterOutValue',
  {
    defaultMessage: 'Filter out value',
  }
);

interface Props {
  field: string;
  onClick?: () => void;
  ownFocus: boolean;
  value?: string[] | string | null;
}

/** Returns a value for the `disabled` prop of `EuiFocusTrap` */

export const FilterOutValueButton: React.FC<Props> = React.memo(
  ({ field, onClick, ownFocus, value }) => (
    <EuiToolTip
      content={
        <TooltipWithKeyboardShortcut
          additionalScreenReaderOnlyContext={getAdditionalScreenReaderOnlyContext({
            field,
            value,
          })}
          content={FILTER_OUT_VALUE}
          shortcut={FILTER_OUT_VALUE_KEYBOARD_SHORTCUT}
          showShortcut={ownFocus}
        />
      }
    >
      <EuiButtonIcon
        aria-label={FILTER_OUT_VALUE}
        className="securitySolution__hoverActionButton"
        data-test-subj="filter-out-value"
        iconSize="s"
        iconType="minusInCircle"
        onClick={onClick}
      />
    </EuiToolTip>
  )
);

FilterOutValueButton.displayName = 'FilterOutValueButton';
