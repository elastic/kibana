/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
  EuiButtonEmpty,
  EuiSpacer,
  EuiTextColor,
} from '@elastic/eui';
import { ValueMaxIcon } from '../../assets/value_max';
import { ValueMinIcon } from '../../assets/value_min';
import { RelatedIcon } from '../../assets/related';
import { DistributeEquallyIcon } from '../../assets/distribute_equally';
import { getDataMinMax, getStepValue, isValidColor, roundValue } from '../coloring/utils';
import type { CustomPaletteParamsConfig, ColorStop } from '../../../common';
import { useDebouncedValue } from '../index';

const DEFAULT_COLOR = '#6092C0';

interface ColorRanges {
  color: string;
  start: number;
  end: number;
}

interface ColorRangesProps {
  colorRanges: ColorRanges[];
  paletteConfiguration: CustomPaletteParamsConfig | undefined;
  onChange: (colorStops: ColorStop[], upperMax: number) => void;
  dataBounds: { min: number; max: number };
}

function areStopsValid(colorStops: Array<{ color: string; stop: number }>) {
  return colorStops.every(({ color, stop }) => !Number.isNaN(stop) && isValidColor(color));
}

function reversePalette(colorRanges: ColorRanges[]) {
  return colorRanges
    .map(({ color }, i) => ({
      color,
      start: colorRanges[colorRanges.length - i - 1].start,
      end: colorRanges[colorRanges.length - i - 1].end,
    }))
    .reverse();
}

export function ColorRanges(props: ColorRangesProps) {
  const { colorRanges, onChange, dataBounds, paletteConfiguration } = props;
  const [isValid, setValid] = useState(true);
  const [isDisabledStart, setDisableStart] = useState(false);
  const [isDisabledEnd, setDisableEnd] = useState(false);
  const onChangeWithValidation = (newColorRanges: ColorRanges[]) => {
    const colorStops = newColorRanges.map((colorRange) => {
      return {
        color: colorRange.color,
        stop: colorRange.start && Number(colorRange.start),
      };
    });
    const upperMax = Number(newColorRanges[newColorRanges.length - 1].end);
    if (areStopsValid(colorStops)) {
      onChange(colorStops, upperMax);
    }
  };
  const { inputValue: localColorRanges, handleInputChange: setColorRanges } = useDebouncedValue({
    onChange: onChangeWithValidation,
    value: colorRanges,
  });
  const rangeType = paletteConfiguration?.rangeType || 'percent';
  const shouldDisableAdd = Boolean(
    paletteConfiguration?.maxSteps && localColorRanges.length >= paletteConfiguration?.maxSteps
  );

  const getColorRangeElem = (colorRange: ColorRanges, index: number, isLast = false) => {
    const value = isLast ? colorRange.end : colorRange.start;
    const showDelete = index !== 0 && !isLast;
    const showEdit = !showDelete && isLast ? isDisabledEnd : isDisabledStart;
    const dataTestPrefix = 'lnsPalettePanel';
    const isDisabled = isLast ? isDisabledEnd : index === 0 ? isDisabledStart : false;
    const isInvalid = (!isValid && isLast) || value === undefined || Number.isNaN(value);
    return (
      <EuiFlexItem
        data-test-subj={`${dataTestPrefix}_dynamicColoring_range_row_${index}`}
        onBlur={(e: FocusEvent<HTMLDivElement>) => {
          const isFocusStillInContent = (e.currentTarget as Node)?.contains(
            e.relatedTarget as Node
          );
          if (!isFocusStillInContent) {
            const maxValue = localColorRanges[localColorRanges.length - 1].end;
            let newColorRanges = [...localColorRanges].sort(
              ({ start: startA }, { start: startB }) => Number(startA) - Number(startB)
            );
            newColorRanges = newColorRanges.map((colorRange, index) => {
              return {
                color: colorRange.color,
                start: colorRange.start,
                end:
                  index !== newColorRanges.length - 1 ? newColorRanges[index + 1].start : maxValue,
              };
            });
            const lastRange = newColorRanges[newColorRanges.length - 1];
            if (lastRange.start > lastRange.end) {
              if (isLast) {
                setValid(false);
              } else {
                const oldEnd = lastRange.end;
                lastRange.end = lastRange.start;
                lastRange.start = oldEnd;
                setValid(true);
              }
            } else {
              setValid(true);
            }

            setColorRanges(newColorRanges);
          }
        }}
      >
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem
            grow={false}
            data-test-subj={`${dataTestPrefix}_dynamicColoring_range_color_${index}`}
          >
            {isLast ? (
              <EuiIcon type={RelatedIcon} />
            ) : (
              <EuiColorPicker
                key={value}
                onChange={(newColor) => {
                  localColorRanges[index].color = newColor;
                  setColorRanges([...localColorRanges]);
                }}
                button={
                  <EuiColorPickerSwatch color={colorRange.color} aria-label="Select a new color" />
                }
                secondaryInputDisplay="top"
                color={colorRange.color}
                isInvalid={!isValidColor(colorRange.color)}
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFieldNumber
              compressed
              isInvalid={isInvalid}
              data-test-subj={`${dataTestPrefix}_dynamicColoring_range_value_${index}`}
              value={value}
              disabled={isDisabled}
              min={-Infinity}
              onChange={({ target }) => {
                const newValue = target.value.trim();

                if (isLast) {
                  setValid(true);
                }

                if (isLast) {
                  localColorRanges[index].end = parseFloat(newValue);
                } else {
                  localColorRanges[index].start = parseFloat(newValue);
                  if (index > 0) {
                    localColorRanges[index - 1].end = parseFloat(newValue);
                  }
                }
                setColorRanges([...localColorRanges]);
              }}
              append={rangeType === 'percent' ? '%' : undefined}
              prepend={
                isLast ? (
                  <label className="euiFormLabel">&#8804;</label>
                ) : (
                  <label className="euiFormLabel">&#8805;</label>
                )
              }
              aria-label={i18n.translate(
                'xpack.lens.dynamicColoring.customPalette.rangeAriaLabel',
                {
                  defaultMessage: 'Range {index}',
                  values: {
                    index: index + 1,
                  },
                }
              )}
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
                title={i18n.translate(
                  'xpack.lens.dynamicColoring.customPalette.deleteButtonLabel',
                  {
                    defaultMessage: 'Delete',
                  }
                )}
                onClick={() => {
                  if (index !== 0 && index !== localColorRanges.length - 1) {
                    localColorRanges[index - 1].end = localColorRanges[index + 1].start;
                  }

                  const newColorRanges = localColorRanges.filter((_, i) => i !== index);
                  setColorRanges(newColorRanges);
                }}
                data-test-subj={`${dataTestPrefix}_dynamicColoring_removeColorRange_${index}`}
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
                  title={i18n.translate(
                    'xpack.lens.dynamicColoring.customPalette.editButtonLabel',
                    {
                      defaultMessage: 'Edit',
                    }
                  )}
                  onClick={() => {
                    let value;
                    const { max } = getDataMinMax(rangeType, dataBounds);
                    const colorStops = localColorRanges.map(({ color, start }) => ({
                      color,
                      stop: Number(start),
                    }));
                    const step = roundValue(getStepValue(colorStops, colorStops, max));
                    if (isLast) {
                      value = localColorRanges[index].start + step;
                    } else {
                      value = localColorRanges[index].end - step;
                    }
                    if (isLast) {
                      setDisableEnd(false);
                    } else {
                      setDisableStart(false);
                    }
                    localColorRanges[index][isLast ? 'end' : 'start'] = roundValue(value);
                    setColorRanges([...localColorRanges]);
                  }}
                  data-test-subj={`${dataTestPrefix}_dynamicColoring_editValue_${index}`}
                />
              ) : (
                <EuiButtonIcon
                  iconType={isLast ? ValueMaxIcon : ValueMinIcon}
                  aria-label={i18n.translate(
                    `xpack.lens.dynamicColoring.customPalette.autoDetect${
                      isLast ? 'Maximum' : 'Minimum'
                    }AriaLabel`,
                    {
                      defaultMessage: `Auto detect ${isLast ? 'maximum' : 'minimum'} value`,
                    }
                  )}
                  title={i18n.translate(
                    `xpack.lens.dynamicColoring.customPalette.autoDetect${
                      isLast ? 'Maximum' : 'Minimum'
                    }Label`,
                    {
                      defaultMessage: `Auto detect ${isLast ? 'maximum' : 'minimum'} value`,
                    }
                  )}
                  onClick={() => {
                    let value;
                    if (rangeType !== 'percent') {
                      value = roundValue(dataBounds[isLast ? 'max' : 'min']);
                    } else {
                      value = isLast ? 100 : 0;
                    }
                    if (isLast) {
                      setDisableEnd(true);
                    } else {
                      setDisableStart(true);
                    }
                    localColorRanges[index][isLast ? 'end' : 'start'] = value;
                    setColorRanges([...localColorRanges]);
                  }}
                  data-test-subj={`${dataTestPrefix}_dynamicColoring_removeColorRange_${index}`}
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
  };

  return (
    <>
      <EuiSpacer size="s" />
      {localColorRanges.map((colorRange, index) => {
        return getColorRangeElem(colorRange, index, false);
      })}
      {getColorRangeElem(
        localColorRanges[localColorRanges.length - 1],
        localColorRanges.length - 1,
        true
      )}
      <EuiSpacer size="s" />
      <EuiButtonEmpty
        data-test-subj={`lnsPalettePanel_dynamicColoring_addColorRange`}
        iconType="plusInCircle"
        color="primary"
        aria-label={i18n.translate('xpack.lens.dynamicColoring.customPalette.addColorRange', {
          defaultMessage: 'Add color range',
        })}
        size="xs"
        flush="left"
        disabled={shouldDisableAdd}
        onClick={() => {
          const newColorRanges = [...localColorRanges];
          const length = newColorRanges.length;
          const { max } = getDataMinMax(rangeType, dataBounds);
          const step = getStepValue(
            colorRanges.map(({ color, start }) => ({ color, stop: Number(start) })),
            newColorRanges.map(({ color, start }) => ({ color, stop: Number(start) })),
            max
          );
          const prevColor = localColorRanges[length - 1].color || DEFAULT_COLOR;
          const newStart = step + Number(localColorRanges[length - 1].start);
          const prevEndValue = newColorRanges[length - 1].end;
          newColorRanges[length - 1].end = newStart;
          newColorRanges.push({
            color: prevColor,
            start: newStart,
            end:
              newStart < prevEndValue
                ? prevEndValue
                : dataBounds.max > newStart
                ? dataBounds.max
                : newStart + step,
          });
          setColorRanges(newColorRanges);
        }}
      >
        {i18n.translate('xpack.lens.dynamicColoring.customPalette.addColorRange', {
          defaultMessage: 'Add color range',
        })}
      </EuiButtonEmpty>
      <EuiButtonEmpty
        data-test-subj={`lnsPalettePanel_dynamicColoring_reverseColors`}
        iconType="sortable"
        color="primary"
        aria-label={i18n.translate('xpack.lens.dynamicColoring.customPalette.reverseColors', {
          defaultMessage: 'Reverse colors',
        })}
        size="xs"
        flush="left"
        onClick={() => {
          setColorRanges(reversePalette(localColorRanges));
        }}
      >
        {i18n.translate('xpack.lens.dynamicColoring.customPalette.reverseColors', {
          defaultMessage: 'Reverse colors',
        })}
      </EuiButtonEmpty>
      <EuiButtonEmpty
        data-test-subj={`lnsPalettePanel_dynamicColoring_distributeEqually`}
        iconType={DistributeEquallyIcon}
        color="primary"
        aria-label={i18n.translate('xpack.lens.dynamicColoring.customPalette.distributeEqually', {
          defaultMessage: 'Distribute equally',
        })}
        size="xs"
        flush="left"
        onClick={() => {
          const colorsCount = localColorRanges.length;
          const start = localColorRanges[0].start;
          const end = localColorRanges[colorsCount - 1].end;
          const step = roundValue((end - start) / colorsCount);
          const newRanges = localColorRanges.map((colorRange, index) => {
            return {
              color: colorRange.color,
              start: roundValue(start + (step * 100 * index) / 100),
              end: roundValue(start + (step * 100 * (index + 1)) / 100),
            };
          });
          setColorRanges(newRanges);
        }}
      >
        {i18n.translate('xpack.lens.dynamicColoring.customPalette.distributeEqually', {
          defaultMessage: 'Distribute equally',
        })}
      </EuiButtonEmpty>
    </>
  );
}
