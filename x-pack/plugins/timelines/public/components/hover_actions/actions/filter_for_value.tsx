/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiButtonIconPropsForButton, EuiToolTip } from '@elastic/eui';
import { TooltipWithKeyboardShortcut } from '../../tooltip_with_keyboard_shortcut';
import { createFilter, getAdditionalScreenReaderOnlyContext } from '../utils';
import { HoverActionComponentProps, FilterValueFnArgs } from './types';

export const FILTER_FOR_VALUE = i18n.translate('xpack.timelines.hoverActions.filterForValue', {
  defaultMessage: 'Filter for value',
});
export const FILTER_FOR_VALUE_KEYBOARD_SHORTCUT = 'f';

export const filterForValueFn = ({
  field,
  value,
  filterManager,
  onFilterAdded,
}: FilterValueFnArgs): void => {
  const filter = value?.length === 0 ? createFilter(field, undefined) : createFilter(field, value);
  const activeFilterManager = filterManager;

  if (activeFilterManager != null) {
    activeFilterManager.addFilters(filter);
    if (onFilterAdded != null) {
      onFilterAdded();
    }
  }
};

export interface FilterForValueProps extends HoverActionComponentProps {
  defaultFocusedButtonRef: EuiButtonIconPropsForButton['buttonRef'];
}

export const FilterForValueButton: React.FC<FilterForValueProps> = React.memo(
  ({ defaultFocusedButtonRef, field, onClick, ownFocus, showTooltip = false, value }) => {
    return showTooltip ? (
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
          className="timelines__hoverActionButton"
          data-test-subj="filter-for-value"
          iconSize="s"
          iconType="plusInCircle"
          onClick={onClick}
        />
      </EuiToolTip>
    ) : (
      <EuiButtonIcon
        aria-label={FILTER_FOR_VALUE}
        buttonRef={defaultFocusedButtonRef}
        className="timelines__hoverActionButton"
        data-test-subj="filter-for-value"
        iconSize="s"
        iconType="plusInCircle"
        onClick={onClick}
      />
    );
  }
);

FilterForValueButton.displayName = 'FilterForValueButton';
