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
  htmlIdGenerator,
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
import { deleteColorRange } from './utils';

const idGeneratorFn = htmlIdGenerator();

export interface ColorRangesItemProps {
  colorRange: ColorRange;
  index: number;
  colorRanges: ColorRange[];
  isLast: boolean;
  paletteConfiguration: CustomPaletteParamsConfig | undefined;
  isValid: boolean;
  setColorRanges: Function;
  dataBounds: DataBounds;
  setValid: Function;
}

const validateLastRange = (
  colorRanges: ColorRange[],
  isLast: boolean,
  isValid: boolean,
  setValid: Function
) => {
  const lastRange = colorRanges[colorRanges.length - 1];
  if (lastRange.start > lastRange.end) {
    if (isLast && isValid) {
      setValid(false);
    }
  } else if (!isValid) {
    setValid(true);
  }
};

export function ColorRangeItem({
  isLast,
  index,
  colorRange,
  colorRanges,
  isValid,
  paletteConfiguration,
  setColorRanges,
  dataBounds,
  setValid,
}: ColorRangesItemProps) {
  const [popoverInFocus, setPopoverInFocus] = useState<boolean>(false);

  let { autoValue = 'none' } = paletteConfiguration ?? {};
  const { rangeType = 'percent' } = paletteConfiguration ?? {};

  const isDisabledStart = ['min', 'all'].includes(autoValue!);
  const isDisabledEnd = ['max', 'all'].includes(autoValue!);

  const value = isLast ? colorRange.end : colorRange.start;
  const showDelete = index !== 0 && !isLast;
  const indexPostfix = isLast ? index + 1 : index;
  const showEdit = !showDelete && isLast ? isDisabledEnd : isDisabledStart;
  const isDisabled = isLast ? isDisabledEnd : index === 0 ? isDisabledStart : false;
  const isInvalid = (!isValid && isLast) || value === undefined || Number.isNaN(value);
  const prevStartValue = colorRanges[index - 1]?.start ?? -Infinity;
  const nextStartValue = colorRanges[index + 1]?.start ?? Infinity;

  const onLeaveFocus = useCallback(
    () => (e: FocusEvent<HTMLDivElement>) => {
      const shouldSort = colorRange.start > nextStartValue || prevStartValue > colorRange.start;
      const isFocusStillInContent =
        (e.currentTarget as Node)?.contains(e.relatedTarget as Node) || popoverInFocus;

      if (!shouldSort) {
        validateLastRange(colorRanges, isLast, isValid, setValid);
      }

      if (shouldSort && !isFocusStillInContent) {
        const maxValue = colorRanges[colorRanges.length - 1].end;
        let newColorRanges = [...colorRanges].sort(
          ({ start: startA }, { start: startB }) => Number(startA) - Number(startB)
        );
        newColorRanges = newColorRanges.map((newColorRange, i) => {
          return {
            id: idGeneratorFn(),
            color: newColorRange.color,
            start: newColorRange.start,
            end: i !== newColorRanges.length - 1 ? newColorRanges[i + 1].start : maxValue,
          };
        });
        const lastRange = newColorRanges[newColorRanges.length - 1];
        if (lastRange.start > lastRange.end && !isLast) {
          const oldEnd = lastRange.end;
          lastRange.end = lastRange.start;
          lastRange.start = oldEnd;
        }

        validateLastRange(colorRanges, isLast, isValid, setValid);

        setColorRanges(newColorRanges);
      }
    },
    [
      colorRange.start,
      colorRanges,
      isLast,
      isValid,
      nextStartValue,
      popoverInFocus,
      prevStartValue,
      setColorRanges,
      setValid,
    ]
  );

  const onDeleteItem = useCallback(() => {
    const newColorRanges = deleteColorRange(index, colorRanges);

    setColorRanges(newColorRanges);
  }, [colorRanges, index, setColorRanges]);

  return (
    <EuiFlexItem
      key={colorRange.id}
      data-test-subj={`dynamicColoring_range_row_${indexPostfix}`}
      onBlur={onLeaveFocus}
    >
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem
          grow={false}
          onBlur={() => {
            // make sure that the popover is closed
            if (!colorRange.color && !popoverInFocus) {
              const newColorRanges = [...colorRanges];
              newColorRanges[index].color = colorRanges[index].color;
              setColorRanges(newColorRanges);
            }
          }}
          data-test-subj={`dynamicColoring_range_color_${indexPostfix}`}
        >
          {isLast ? (
            <EuiIcon type={RelatedIcon} size="l" />
          ) : (
            <EuiColorPicker
              key={value}
              onChange={(newColor) => {
                colorRanges[index].color = newColor;
                setColorRanges([...colorRanges]);
              }}
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
                if (colorRange.color === '') {
                  const newColorRanges = [...colorRanges];
                  newColorRanges[index].color = colorRanges[index].color;
                  setColorRanges(newColorRanges);
                }
              }}
              isInvalid={!isValidColor(colorRange.color)}
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFieldNumber
            compressed
            isInvalid={isInvalid}
            data-test-subj={`dynamicColoring_range_value_${indexPostfix}`}
            value={value}
            disabled={isDisabled}
            onChange={({ target }) => {
              const newValue = target.value.trim();

              if (isLast) {
                setValid(true);
              }

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
                    autoValue = autoValue === 'all' ? 'min' : 'none';
                  } else {
                    autoValue = autoValue === 'all' ? 'max' : 'none';
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
                    autoValue = autoValue === 'none' ? 'max' : 'all';
                  } else {
                    autoValue = autoValue === 'none' ? 'min' : 'all';
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
