/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

import { stopPropagationAndPreventDefault } from '../../../../common';
import { TooltipWithKeyboardShortcut } from '../../tooltip_with_keyboard_shortcut';
import { createFilter, getAdditionalScreenReaderOnlyContext } from '../utils';
import { HoverActionComponentProps, FilterValueFnArgs } from './types';

export const FILTER_FOR_VALUE = i18n.translate('xpack.timelines.hoverActions.filterIn', {
  defaultMessage: 'Filter In',
});
export const FILTER_FOR_VALUE_KEYBOARD_SHORTCUT = 'f';

export type FilterForValueProps = HoverActionComponentProps & FilterValueFnArgs;

const FilterForValueButton: React.FC<FilterForValueProps> = React.memo(
  ({
    Component,
    defaultFocusedButtonRef,
    field,
    filterManager,
    keyboardEvent,
    onFilterAdded,
    ownFocus,
    onClick,
    size,
    showTooltip = false,
    value,
  }) => {
    const filterForValueFn = useCallback(() => {
      const makeFilter = (currentVal: string | null | undefined) =>
        currentVal?.length === 0 ? createFilter(field, undefined) : createFilter(field, currentVal);
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

      if (onClick != null) {
        onClick();
      }
    }, [field, filterManager, onClick, onFilterAdded, value]);

    useEffect(() => {
      if (!ownFocus) {
        return;
      }
      if (keyboardEvent?.key === FILTER_FOR_VALUE_KEYBOARD_SHORTCUT) {
        stopPropagationAndPreventDefault(keyboardEvent);
        filterForValueFn();
      }
    }, [filterForValueFn, keyboardEvent, ownFocus]);

    const button = useMemo(
      () =>
        Component ? (
          <Component
            aria-label={FILTER_FOR_VALUE}
            buttonRef={defaultFocusedButtonRef}
            data-test-subj="filter-for-value"
            iconType="plusInCircle"
            onClick={filterForValueFn}
            size={size}
            title={FILTER_FOR_VALUE}
          >
            {FILTER_FOR_VALUE}
          </Component>
        ) : (
          <EuiButtonIcon
            aria-label={FILTER_FOR_VALUE}
            buttonRef={defaultFocusedButtonRef}
            className="timelines__hoverActionButton"
            data-test-subj="filter-for-value"
            iconSize="s"
            iconType="plusInCircle"
            onClick={filterForValueFn}
            size={size}
          />
        ),
      [Component, defaultFocusedButtonRef, filterForValueFn, size]
    );

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
        {button}
      </EuiToolTip>
    ) : (
      button
    );
  }
);

FilterForValueButton.displayName = 'FilterForValueButton';

// eslint-disable-next-line import/no-default-export
export { FilterForValueButton as default };
