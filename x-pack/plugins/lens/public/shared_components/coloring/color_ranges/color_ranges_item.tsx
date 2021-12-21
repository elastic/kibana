/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, Dispatch, FocusEvent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiFieldNumber,
  EuiColorPicker,
  EuiFlexItem,
  EuiFlexGroup,
  EuiIcon,
  EuiFormRow,
  EuiColorPickerSwatch,
} from '@elastic/eui';

import { RelatedIcon } from '../../../assets/related';
import { isValidColor } from '../utils';
import {
  ColorRangeDeleteButton,
  ColorRangeAutoDetectButton,
  ColorRangeEditButton,
  ColorRangesItemButtonProps,
} from './color_ranges_item_buttons';

import type {
  ColorRange,
  DataBounds,
  ColorRangeAccessor,
  ColorRangeValidation,
  ColorRangesActions,
} from './types';

import type { CustomPaletteParamsConfig } from '../../../../common';

export interface ColorRangesItemProps {
  colorRange: ColorRange;
  index: number;
  colorRanges: ColorRange[];
  paletteConfiguration: CustomPaletteParamsConfig | undefined;
  colorRangeValidation?: ColorRangeValidation;
  dispatch: Dispatch<ColorRangesActions>;
  dataBounds: DataBounds;
  accessor: ColorRangeAccessor;
}

export function ColorRangeItem({
  accessor,
  index,
  dataBounds,
  colorRange,
  colorRanges,
  colorRangeValidation,
  paletteConfiguration,
  dispatch,
}: ColorRangesItemProps) {
  const value = `${colorRange[accessor]}`;
  const [popoverInFocus, setPopoverInFocus] = useState<boolean>(false);
  const [localValue, setLocalValue] = useState<string>(value ?? '');

  const { rangeType = 'percent' } = paletteConfiguration ?? {};
  const autoValue = paletteConfiguration?.autoValue ?? 'none';

  const isDisabledStart = ['min', 'all'].includes(autoValue!);
  const isDisabledEnd = ['max', 'all'].includes(autoValue!);

  const isLast = accessor === 'end';
  const isDisabled = isLast ? isDisabledEnd : index === 0 ? isDisabledStart : false;
  const showColorPicker = !isLast;

  let ActionButton: React.FunctionComponent<ColorRangesItemButtonProps>;

  if (index !== 0 && !isLast) {
    ActionButton = ColorRangeDeleteButton;
  } else {
    const showEdit = isLast ? isDisabledEnd : isDisabledStart;

    ActionButton = showEdit ? ColorRangeEditButton : ColorRangeAutoDetectButton;
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

  const isInvalid = !(colorRangeValidation?.isValid ?? true);

  useEffect(() => {
    if (!isInvalid && value !== localValue) {
      setLocalValue(value);
    }
  }, [isInvalid, localValue, value]);

  return (
    <EuiFormRow
      fullWidth={true}
      hasEmptyLabelSpace
      data-test-subj={`dynamicColoring_range_row_${index}`}
      isInvalid={isInvalid}
      error={colorRangeValidation?.errors.join(' ')}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          {showColorPicker ? (
            <EuiColorPicker
              onChange={onUpdateColor}
              button={
                <EuiColorPickerSwatch
                  color={colorRange.color}
                  aria-label={i18n.translate(
                    'xpack.lens.dynamicColoring.customPalette.selectNewColor',
                    {
                      defaultMessage: 'Select a new color',
                    }
                  )}
                />
              }
              secondaryInputDisplay="top"
              color={colorRange.color}
              onFocus={() => setPopoverInFocus(true)}
              onBlur={() => {
                setPopoverInFocus(false);
              }}
              isInvalid={!isValidColor(colorRange.color)}
            />
          ) : (
            <EuiIcon type={RelatedIcon} size="l" />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiFieldNumber
            compressed
            fullWidth={true}
            isInvalid={isInvalid}
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
              paletteConfiguration={paletteConfiguration}
              colorRanges={colorRanges}
              dispatch={dispatch}
              accessor={accessor}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiFormRow>
  );
}
