/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

import { stopPropagationAndPreventDefault } from '../../../../common';
import { TooltipWithKeyboardShortcut } from '../../tooltip_with_keyboard_shortcut';
import { createFilter, getAdditionalScreenReaderOnlyContext } from '../utils';
import { HoverActionComponentProps, FilterValueFnArgs } from './types';

export const FILTER_OUT_VALUE = i18n.translate('xpack.timelines.hoverActions.filterOutValue', {
  defaultMessage: 'Filter out value',
});

export const FILTER_OUT_VALUE_KEYBOARD_SHORTCUT = 'o';

const FilterOutValueButton: React.FC<HoverActionComponentProps & FilterValueFnArgs> = React.memo(
  ({
    closePopOver,
    defaultFocusedButtonRef,
    field,
    filterManager,
    keyboardEvent,
    onFilterAdded,
    ownFocus,
    showTooltip = false,
    value,
  }) => {
    const filterOutValueFn = useCallback(() => {
      const makeFilter = (currentVal: string | null | undefined) =>
        currentVal?.length === 0
          ? createFilter(field, null, false)
          : createFilter(field, currentVal, true);
      const filters = Array.isArray(value)
        ? value.map((currentVal: string | null | undefined) => makeFilter(currentVal))
        : makeFilter(value);

      const activeFilterManager = filterManager;

      if (activeFilterManager != null) {
        activeFilterManager.addFilters(filters);
        if (onFilterAdded != null) {
          onFilterAdded();
        }
      }
      if (closePopOver != null) {
        closePopOver();
      }
    }, [closePopOver, field, filterManager, onFilterAdded, value]);

    useEffect(() => {
      if (!ownFocus) {
        return;
      }
      if (keyboardEvent?.key === FILTER_OUT_VALUE_KEYBOARD_SHORTCUT) {
        stopPropagationAndPreventDefault(keyboardEvent);
        filterOutValueFn();
      }
    }, [filterOutValueFn, keyboardEvent, ownFocus]);

    return showTooltip ? (
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
          buttonRef={defaultFocusedButtonRef}
          className="timelines__hoverActionButton"
          data-test-subj="filter-out-value"
          iconSize="s"
          iconType="minusInCircle"
          onClick={filterOutValueFn}
        />
      </EuiToolTip>
    ) : (
      <EuiButtonIcon
        aria-label={FILTER_OUT_VALUE}
        buttonRef={defaultFocusedButtonRef}
        className="timelines__hoverActionButton"
        data-test-subj="filter-out-value"
        iconSize="s"
        iconType="minusInCircle"
        onClick={filterOutValueFn}
      />
    );
  }
);

FilterOutValueButton.displayName = 'FilterOutValueButton';

// eslint-disable-next-line import/no-default-export
export { FilterOutValueButton as default };
