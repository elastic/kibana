/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import type { FocusEvent } from 'react';
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

import type { ColorRange, DataBounds } from './types';
import type { CustomPaletteParamsConfig } from '../../../../common';

import { sortColorRanges, updateColor } from './utils';
import type { AutoValueMode, ColorRangeValidation } from './types';
import {
  ColorRangeDeleteButton,
  ColorRangeAutoDetectButton,
  ColorRangeEditButton,
  ColorRangesItemButtonProps,
} from './color_ranges_item_buttons';

export interface ColorRangesItemProps {
  colorRange: ColorRange;
  index: number;
  colorRanges: ColorRange[];
  isLast: boolean;
  paletteConfiguration: CustomPaletteParamsConfig | undefined;
  colorRangeValidation?: ColorRangeValidation;
  setColorRanges: Function;
  dataBounds: DataBounds;

  // todo: for removing
  autoValue: AutoValueMode;
  setAutoValue: Function;
}

export function ColorRangeItem({
  isLast,
  index,
  dataBounds,
  colorRange,
  colorRanges,
  colorRangeValidation,
  paletteConfiguration,
  setColorRanges,
  autoValue,
  setAutoValue,
}: ColorRangesItemProps) {
  const [popoverInFocus, setPopoverInFocus] = useState<boolean>(false);

  const { rangeType = 'percent' } = paletteConfiguration ?? {};
  const isDisabledStart = ['min', 'all'].includes(autoValue!);
  const isDisabledEnd = ['max', 'all'].includes(autoValue!);

  const value = isLast ? colorRange.end : colorRange.start;

  const indexPostfix = isLast ? index + 1 : index;
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

        setColorRanges(newColorRanges);
      }
    },
    [colorRange.start, colorRanges, index, isLast, popoverInFocus, setColorRanges]
  );

  const onValueChange = useCallback(
    ({ target }) => {
      const newValue = target.value.trim();

      if (isLast) {
        colorRanges[index].end = parseFloat(newValue);
      } else {
        colorRanges[index].start = parseFloat(newValue);
        if (index > 0) {
          colorRanges[index - 1].end = parseFloat(newValue);
        }
      }
      setColorRanges([...colorRanges]);
    },
    [colorRanges, index, isLast, setColorRanges]
  );

  const onUpdateColor = useCallback(
    (color: string) => {
      const newColorRanges = updateColor(index, color, colorRanges);

      setColorRanges(newColorRanges);
    },
    [colorRanges, index, setColorRanges]
  );

  const isInvalid = !(colorRangeValidation?.isValid ?? true);

  return (
    <EuiFormRow
      fullWidth={true}
      hasEmptyLabelSpace
      data-test-subj={`dynamicColoring_range_row_${indexPostfix}`}
      isInvalid={isInvalid}
      error={colorRangeValidation?.errors.join(' ')}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false} data-test-subj={`dynamicColoring_range_color_${indexPostfix}`}>
          {showColorPicker ? (
            <EuiColorPicker
              key={value}
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
        <EuiFlexItem>
          <EuiFieldNumber
            compressed
            isInvalid={isInvalid}
            data-test-subj={`dynamicColoring_range_value_${indexPostfix}`}
            value={value}
            disabled={isDisabled}
            onChange={onValueChange}
            append={rangeType === 'percent' ? '%' : undefined}
            onBlur={onLeaveFocus}
            prepend={<span className="euiFormLabel">{isLast ? '\u2264' : '\u2265'}</span>}
            aria-label={i18n.translate('xpack.lens.dynamicColoring.customPalette.rangeAriaLabel', {
              defaultMessage: 'Range {index}',
              values: {
                index: indexPostfix + 1,
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
              isLast={isLast}
              setAutoValue={setAutoValue}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiFormRow>
  );
}
