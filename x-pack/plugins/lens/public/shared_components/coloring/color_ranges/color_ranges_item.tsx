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
  EuiButtonIcon,
  EuiFlexItem,
  EuiFlexGroup,
  EuiIcon,
  EuiColorPickerSwatch,
  EuiSpacer,
  EuiTextColor,
} from '@elastic/eui';

import { ValueMaxIcon } from '../../../assets/value_max';
import { ValueMinIcon } from '../../../assets/value_min';
import { RelatedIcon } from '../../../assets/related';
import { getDataMinMax, getStepValue, isValidColor, roundValue, getAutoValues } from '../utils';

import type { ColorRange, DataBounds } from './types';
import type { CustomPaletteParamsConfig } from '../../../../common';

import { deleteColorRange, sortColorRanges, updateColor } from './utils';
import type { AutoValueMode } from './types';

export interface ColorRangesItemProps {
  colorRange: ColorRange;
  index: number;
  colorRanges: ColorRange[];
  isLast: boolean;
  paletteConfiguration: CustomPaletteParamsConfig | undefined;
  isValid: boolean;
  setColorRanges: Function;
  dataBounds: DataBounds;

  // todo: for removing
  autoValue: AutoValueMode;
  setAutoValue: Function;
}

export function ColorRangeItem({
  isLast,
  index,
  colorRange,
  colorRanges,
  isValid,
  paletteConfiguration,
  setColorRanges,
  dataBounds,
  autoValue,
  setAutoValue,
}: ColorRangesItemProps) {
  const [popoverInFocus, setPopoverInFocus] = useState<boolean>(false);

  const { rangeType = 'percent' } = paletteConfiguration ?? {};

  const isDisabledStart = ['min', 'all'].includes(autoValue!);
  const isDisabledEnd = ['max', 'all'].includes(autoValue!);

  const value = isLast ? colorRange.end : colorRange.start;
  const showDelete = index !== 0 && !isLast;
  const indexPostfix = isLast ? index + 1 : index;
  const showEdit = !showDelete && isLast ? isDisabledEnd : isDisabledStart;
  const isDisabled = isLast ? isDisabledEnd : index === 0 ? isDisabledStart : false;

  const onLeaveFocus = useCallback(
    () => (e: FocusEvent<HTMLDivElement>) => {
      const prevStartValue = colorRanges[index - 1]?.start ?? -Infinity;
      const nextStartValue = colorRanges[index + 1]?.start ?? Infinity;

      const shouldSort = colorRange.start > nextStartValue || prevStartValue > colorRange.start;
      const isFocusStillInContent =
        (e.currentTarget as Node)?.contains(e.relatedTarget as Node) || popoverInFocus;

      if (shouldSort && !isFocusStillInContent) {
        const newColorRanges = sortColorRanges(colorRanges);
        const lastRange = newColorRanges[newColorRanges.length - 1];

        // ?
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

  const onDeleteItem = useCallback(() => {
    const newColorRanges = deleteColorRange(index, colorRanges);

    setColorRanges(newColorRanges);
  }, [colorRanges, index, setColorRanges]);

  const onUpdateColor = useCallback(
    (color: string) => {
      const newColorRanges = updateColor(index, color, colorRanges);

      setColorRanges(newColorRanges);
    },
    [colorRanges, index, setColorRanges]
  );

  return (
    <EuiFlexItem
      key={colorRange.id}
      data-test-subj={`dynamicColoring_range_row_${indexPostfix}`}
      onBlur={onLeaveFocus}
    >
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false} data-test-subj={`dynamicColoring_range_color_${indexPostfix}`}>
          {isLast ? (
            <EuiIcon type={RelatedIcon} size="l" />
          ) : (
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
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFieldNumber
            compressed
            isInvalid={!isValid}
            data-test-subj={`dynamicColoring_range_value_${indexPostfix}`}
            value={value}
            disabled={isDisabled}
            onChange={({ target }) => {
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
            }}
            append={rangeType === 'percent' ? '%' : undefined}
            prepend={<span className="euiFormLabel">{isLast ? '\u2264' : '\u2265'}</span>}
            aria-label={i18n.translate('xpack.lens.dynamicColoring.customPalette.rangeAriaLabel', {
              defaultMessage: 'Range {index}',
              values: {
                index: indexPostfix + 1,
              },
            })}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          {showDelete && (
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              aria-label={i18n.translate(
                'xpack.lens.dynamicColoring.customPalette.deleteButtonAriaLabel',
                {
                  defaultMessage: 'Delete',
                }
              )}
              title={i18n.translate('xpack.lens.dynamicColoring.customPalette.deleteButtonLabel', {
                defaultMessage: 'Delete',
              })}
              onClick={onDeleteItem}
              data-test-subj={`dynamicColoring_removeColorRange_${indexPostfix}`}
            />
          )}
          {!showDelete &&
            (showEdit ? (
              <EuiButtonIcon
                iconType="pencil"
                aria-label={i18n.translate(
                  'xpack.lens.dynamicColoring.customPalette.editButtonAriaLabel',
                  {
                    defaultMessage: 'Edit',
                  }
                )}
                title={i18n.translate('xpack.lens.dynamicColoring.customPalette.editButtonLabel', {
                  defaultMessage: 'Edit',
                })}
                onClick={() => {
                  let newValue;
                  const { max } = getDataMinMax(rangeType, dataBounds);
                  const colorStops = colorRanges.map(({ color, start }) => ({
                    color,
                    stop: Number(start),
                  }));
                  const step = roundValue(getStepValue(colorStops, colorStops, max));
                  if (isLast) {
                    newValue = colorRanges[index].start + step;
                  } else {
                    newValue = colorRanges[index].end - step;
                  }
                  if (isLast) {
                    setAutoValue(autoValue === 'all' ? 'min' : 'none');
                  } else {
                    setAutoValue(autoValue === 'all' ? 'max' : 'none');
                  }
                  colorRanges[index][isLast ? 'end' : 'start'] = roundValue(newValue);
                  setColorRanges([...colorRanges]);
                }}
                data-test-subj={`dynamicColoring_editValue_${indexPostfix}`}
              />
            ) : (
              <EuiButtonIcon
                iconType={isLast ? ValueMaxIcon : ValueMinIcon}
                aria-label={
                  isLast
                    ? i18n.translate(
                        'xpack.lens.dynamicColoring.customPalette.autoDetectMaximumAriaLabel',
                        {
                          defaultMessage: 'Auto detect maximum value',
                        }
                      )
                    : i18n.translate(
                        'xpack.lens.dynamicColoring.customPalette.autoDetectMinimumAriaLabel',
                        {
                          defaultMessage: 'Auto detect minimum value',
                        }
                      )
                }
                title={
                  isLast
                    ? i18n.translate(
                        'xpack.lens.dynamicColoring.customPalette.autoDetectMaximumLabel',
                        {
                          defaultMessage: 'Auto detect maximum value',
                        }
                      )
                    : i18n.translate(
                        'xpack.lens.dynamicColoring.customPalette.autoDetectMinimumLabel',
                        {
                          defaultMessage: 'Auto detect minimum value',
                        }
                      )
                }
                onClick={() => {
                  const { max: autoMax, min: autoMin } = getAutoValues(
                    {
                      first: colorRanges[1].start,
                      preLast: colorRanges[colorRanges.length - 2].start,
                      last: colorRanges[colorRanges.length - 1].start,
                    },
                    rangeType,
                    dataBounds
                  );
                  const newValue = roundValue(isLast ? autoMax : autoMin);
                  if (isLast) {
                    setAutoValue(autoValue === 'none' ? 'max' : 'all');
                  } else {
                    setAutoValue(autoValue === 'none' ? 'min' : 'all');
                  }

                  colorRanges[index][isLast ? 'end' : 'start'] = newValue;
                  setColorRanges([...colorRanges]);
                }}
                data-test-subj={`dynamicColoring_autoDetect_${isLast ? 'maximum' : 'minimum'}`}
              />
            ))}
        </EuiFlexItem>
      </EuiFlexGroup>
      {!isValid && isLast && (
        <>
          <EuiSpacer size="s" />
          <EuiTextColor color="danger" data-test-subj="lensDateHistogramError">
            {i18n.translate('xpack.lens.dynamicColoring.customPalette.invalidMaxValue', {
              defaultMessage: 'Maximum value should be greater than preceding values',
            })}
          </EuiTextColor>
        </>
      )}
    </EuiFlexItem>
  );
}
