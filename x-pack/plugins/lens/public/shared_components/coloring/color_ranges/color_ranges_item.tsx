/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';

import type { FocusEvent } from 'react';

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
import { sortColorRanges, updateColorRangeColor, updateColorRangeValue } from './utils';
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
  ColorRangesUpdateFn,
  ColorRangeValidation,
} from './types';

import type { CustomPaletteParamsConfig } from '../../../../common';

export interface ColorRangesItemProps {
  colorRange: ColorRange;
  index: number;
  colorRanges: ColorRange[];
  paletteConfiguration: CustomPaletteParamsConfig | undefined;
  colorRangeValidation?: ColorRangeValidation;
  setColorRanges: ColorRangesUpdateFn;
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
  setColorRanges,
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
        const newColorRanges = sortColorRanges(colorRanges);
        const lastRange = newColorRanges[newColorRanges.length - 1];

        if (lastRange.start > lastRange.end && !isLast) {
          const oldEnd = lastRange.end;
          lastRange.end = lastRange.start;
          lastRange.start = oldEnd;
        }

        setColorRanges({ colorRanges: newColorRanges });
      }
    },
    [colorRange.start, colorRanges, index, isLast, popoverInFocus, setColorRanges]
  );

  const onValueChange = useCallback(
    ({ target }) => {
      const newValue = target.value;

      setLocalValue(newValue);
      setColorRanges({
        colorRanges: updateColorRangeValue(index, newValue, accessor, colorRanges),
      });
    },
    [accessor, colorRanges, index, setColorRanges]
  );

  const onUpdateColor = useCallback(
    (color: string) => {
      setColorRanges({ colorRanges: updateColorRangeColor(index, color, colorRanges) });
    },
    [colorRanges, index, setColorRanges]
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
              setColorRanges={setColorRanges}
              accessor={accessor}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiFormRow>
  );
}
