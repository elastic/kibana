/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useCallback, useEffect, Dispatch, FocusEvent } from 'react';

import {
  EuiFieldNumber,
  EuiColorPicker,
  EuiFlexItem,
  EuiFlexGroup,
  EuiIcon,
  EuiColorPickerSwatch,
  EuiButtonIcon,
} from '@elastic/eui';

import { RelatedIcon } from '../../../assets/related';
import { isLastItem } from './utils';
import { isValidColor } from '../utils';
import {
  ColorRangeDeleteButton,
  ColorRangeAutoDetectButton,
  ColorRangeEditButton,
  ColorRangesItemButtonProps,
} from './color_ranges_item_buttons';

import type { ColorRange, DataBounds, ColorRangeAccessor, ColorRangesActions } from './types';
import type { CustomPaletteParams } from '../../../../common';

export interface ColorRangesItemProps {
  colorRange: ColorRange;
  index: number;
  colorRanges: ColorRange[];
  dispatch: Dispatch<ColorRangesActions>;
  dataBounds: DataBounds;
  rangeType: CustomPaletteParams['rangeType'];
  continuity: CustomPaletteParams['continuity'];
  accessor: ColorRangeAccessor;
  isValid?: boolean;
}

const getMode = (
  index: ColorRangesItemProps['index'],
  isLast: boolean,
  continuity: ColorRangesItemProps['continuity'] = 'none'
) => {
  if (!isLast && index > 0) {
    return 'value';
  }
  return (isLast ? ['above', 'all'] : ['below', 'all']).includes(continuity) ? 'edit' : 'auto';
};

export function ColorRangeItem({
  accessor,
  index,
  dataBounds,
  colorRange,
  rangeType,
  colorRanges,
  isValid = true,
  continuity,
  dispatch,
}: ColorRangesItemProps) {
  const value = `${colorRange[accessor]}`;
  const [popoverInFocus, setPopoverInFocus] = useState<boolean>(false);
  const [localValue, setLocalValue] = useState<string>(value ?? '');
  const isLast = isLastItem(accessor);
  const mode = getMode(index, isLast, continuity);
  const isDisabled = mode === 'auto';
  const isColorValid = isValidColor(colorRange.color);

  let ActionButton: React.FunctionComponent<ColorRangesItemButtonProps>;

  if (mode === 'value') {
    ActionButton = ColorRangeDeleteButton;
  } else {
    ActionButton = mode === 'edit' ? ColorRangeEditButton : ColorRangeAutoDetectButton;
  }

  const onLeaveFocus = useCallback(
    (e: FocusEvent<HTMLDivElement>) => {
      const prevStartValue = colorRanges[index - 1]?.start ?? -Infinity;
      const nextStartValue = colorRanges[index + 1]?.start ?? Infinity;

      const shouldSort = colorRange.start > nextStartValue || prevStartValue > colorRange.start;
      const isFocusStillInContent =
        (e.currentTarget as Node)?.contains(e.relatedTarget as Node) || popoverInFocus;

      if (shouldSort && !isFocusStillInContent) {
        dispatch({ type: 'sortColorRanges' });
      }
    },
    [colorRange.start, colorRanges, dispatch, index, popoverInFocus]
  );

  const onValueChange = useCallback(
    ({ target }) => {
      const newValue = target.value;

      setLocalValue(newValue);
      dispatch({ type: 'updateValue', payload: { index, value: newValue, accessor } });
    },
    [dispatch, index, accessor]
  );

  const onUpdateColor = useCallback(
    (color: string) => {
      dispatch({ type: 'updateColor', payload: { index, color } });
    },
    [dispatch, index]
  );

  useEffect(() => {
    if (isValid && value !== localValue) {
      setLocalValue(value);
    }
  }, [isValid, localValue, value]);

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      data-test-subj={`dynamicColoring_range_row_${index}`}
    >
      <EuiFlexItem grow={false}>
        {!isLast ? (
          <EuiColorPicker
            onChange={onUpdateColor}
            button={
              isColorValid ? (
                <EuiColorPickerSwatch
                  color={colorRange.color}
                  aria-label={i18n.translate(
                    'xpack.lens.dynamicColoring.customPalette.selectNewColor',
                    {
                      defaultMessage: 'Select a new color',
                    }
                  )}
                />
              ) : (
                <EuiButtonIcon color="danger" iconType="alert" />
              )
            }
            secondaryInputDisplay="top"
            color={colorRange.color}
            onFocus={() => setPopoverInFocus(true)}
            onBlur={() => {
              setPopoverInFocus(false);
            }}
            isInvalid={!isColorValid}
          />
        ) : (
          <EuiIcon type={RelatedIcon} size="l" />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <EuiFieldNumber
          compressed
          fullWidth={true}
          isInvalid={!isValid}
          data-test-subj={`dynamicColoring_range_value`}
          value={localValue}
          disabled={isDisabled}
          onChange={onValueChange}
          append={rangeType === 'percent' ? '%' : undefined}
          onBlur={onLeaveFocus}
          prepend={<span className="euiFormLabel">{isLast ? '\u2264' : '\u2265'}</span>}
          aria-label={i18n.translate('xpack.lens.dynamicColoring.customPalette.rangeAriaLabel', {
            defaultMessage: 'Range {index}',
            values: {
              index: index + 1,
            },
          })}
        />
      </EuiFlexItem>

      {ActionButton ? (
        <EuiFlexItem grow={false}>
          <ActionButton
            index={index}
            dataBounds={dataBounds}
            continuity={continuity}
            rangeType={rangeType}
            colorRanges={colorRanges}
            dispatch={dispatch}
            accessor={accessor}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
