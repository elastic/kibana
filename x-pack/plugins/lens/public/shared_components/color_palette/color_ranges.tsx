/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
  htmlIdGenerator,
  EuiTextColor,
} from '@elastic/eui';
import { InfinityIcon } from '../../assets/infinity_icon';
import { RelatedIcon } from '../../assets/related';
import { getDataMinMax, getStepValue, isValidColor } from '../coloring/utils';
import { useDebouncedValue } from '../index';

const idGeneratorFn = htmlIdGenerator();
const DEFAULT_COLOR = '#6092C0';

function areStopsValid(colorStops: Array<{ color: string; stop: string }>) {
  return colorStops.every(
    ({ color, stop }) => !Number.isNaN(parseFloat(stop)) && isValidColor(color)
  );
}

function reversePalette(colorRanges) {
  return colorRanges
    .map(({ color }, i) => ({
      color,
      start: colorRanges[colorRanges.length - i - 1].start,
      end: colorRanges[colorRanges.length - i - 1].end,
    }))
    .reverse();
}

export function ColorRanges(props) {
  const { colorRanges, rangeType, onChange, dataBounds } = props;
  const [isValid, setValid] = useState(true);
  const onChangeWithValidation = (newColorRanges) => {
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

  const getColorRangeElem = (colorRange, index, isLast = false) => {
    const value = isLast ? colorRange.end : colorRange.start;
    const showDelete = index !== 0 && !isLast;
    const showEdit = !showDelete && !isFinite(isLast ? colorRange.end : colorRange.start);
    const dataTestPrefix = 'lnsPalettePanel';
    return (
      <EuiFlexItem
        //key={id}
        data-test-subj={`${dataTestPrefix}_dynamicColoring_stop_row_${index}`}
        onBlur={(e: FocusEvent<HTMLDivElement>) => {
          const isFocusStillInContent = (e.currentTarget as Node)?.contains(
            e.relatedTarget as Node
          );
          if (!isFocusStillInContent) {
            const newColorRanges = colorRanges.sort(
              ({ start: startA }, { start: startB }) => Number(startA) - Number(startB)
            );
            const lastRange = newColorRanges[newColorRanges.length - 1];
            if (Number(lastRange.start) > Number(lastRange.end)) {
              setValid(false);
            }

            setColorRanges(newColorRanges);
          }
        }}
      >
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem
            grow={false}
            data-test-subj={`${dataTestPrefix}_dynamicColoring_stop_color_${index}`}
          >
            {isLast ? (
              <EuiIcon type={RelatedIcon} />
            ) : (
              <EuiColorPicker
                key={value}
                onChange={(newColor) => {
                  colorRanges[index].color = newColor;
                  setColorRanges([...colorRanges]);
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
              isInvalid={!isValid && isLast}
              data-test-subj={`${dataTestPrefix}_dynamicColoring_stop_value_${index}`}
              value={isFinite(value) ? value : ''}
              placeholder={!isFinite(value) ? `${!isLast ? '-' : ''}∞` : ''}
              disabled={!isFinite(value)}
              min={-Infinity}
              onChange={({ target }) => {
                const newValue = target.value.trim();

                setValid(true);

                if (isLast) {
                  colorRanges[index].end = newValue;
                } else {
                  colorRanges[index].start = newValue;
                  if (index > 0) {
                    colorRanges[index - 1].end = newValue;
                  }
                }
                setColorRanges([...colorRanges]);
              }}
              append={rangeType === 'percent' ? '%' : undefined}
              prepend={
                isLast ? (
                  <label className="euiFormLabel">&#8804;</label>
                ) : (
                  <label className="euiFormLabel">&#8805;</label>
                )
              }
              aria-label={i18n.translate('xpack.lens.dynamicColoring.customPalette.stopAriaLabel', {
                defaultMessage: 'Stop {index}',
                values: {
                  index: index + 1,
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
                title={i18n.translate(
                  'xpack.lens.dynamicColoring.customPalette.deleteButtonLabel',
                  {
                    defaultMessage: 'Delete',
                  }
                )}
                onClick={() => {
                  const newColorRanges = colorRanges.filter((_, i) => i !== index);
                  setColorRanges(newColorRanges);
                }}
                data-test-subj={`${dataTestPrefix}_dynamicColoring_removeStop_${index}`}
              />
            )}
            {!showDelete &&
              (showEdit ? (
                <EuiButtonIcon
                  iconType="pencil"
                  aria-label={i18n.translate(
                    'xpack.lens.dynamicColoring.customPalette.deleteButtonAriaLabel',
                    {
                      defaultMessage: 'Edit',
                    }
                  )}
                  title={i18n.translate(
                    'xpack.lens.dynamicColoring.customPalette.deleteButtonLabel',
                    {
                      defaultMessage: 'Edit',
                    }
                  )}
                  onClick={() => {
                    let value;
                    const { max } = getDataMinMax(rangeType, dataBounds);
                    const colorStops = colorRanges.map(({ color, start }) => ({
                      color,
                      stop: Number(start),
                    }));
                    const step = getStepValue(colorStops, colorStops, max);
                    if (isLast) {
                      value = colorRanges[index].start + step;
                    } else {
                      value = colorRanges[index].end - step;
                    }
                    colorRanges[index][isLast ? 'end' : 'start'] = value;
                    setColorRanges([...colorRanges]);
                  }}
                  data-test-subj={`${dataTestPrefix}_dynamicColoring_removeStop_${index}`}
                />
              ) : (
                <EuiButtonIcon
                  iconType={InfinityIcon}
                  aria-label={i18n.translate(
                    'xpack.lens.dynamicColoring.customPalette.deleteButtonAriaLabel',
                    {
                      defaultMessage: 'Set Infinity',
                    }
                  )}
                  title={i18n.translate(
                    'xpack.lens.dynamicColoring.customPalette.deleteButtonLabel',
                    {
                      defaultMessage: 'Set Infinity',
                    }
                  )}
                  onClick={() => {
                    colorRanges[index][isLast ? 'end' : 'start'] = isLast ? Infinity : -Infinity;
                    setColorRanges([...colorRanges]);
                  }}
                  data-test-subj={`${dataTestPrefix}_dynamicColoring_removeStop_${index}`}
                />
              ))}
          </EuiFlexItem>
        </EuiFlexGroup>
        {!isValid && isLast && (
          <>
            <EuiSpacer size="s" />
            <EuiTextColor color="danger" data-test-subj="lensDateHistogramError">
              {i18n.translate('xpack.lens.indexPattern.invalidInterval', {
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
        data-test-subj={`_dynamicColoring_addStop`}
        iconType="plusInCircle"
        color="primary"
        aria-label={i18n.translate('xpack.lens.dynamicColoring.customPalette.addColorStop', {
          defaultMessage: 'Add color range',
        })}
        size="xs"
        flush="left"
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
                : Infinity,
            id: idGeneratorFn(),
          });
          setColorRanges(newColorRanges);
        }}
      >
        {i18n.translate('xpack.lens.dynamicColoring.customPalette.addColorStop', {
          defaultMessage: 'Add color range',
        })}
      </EuiButtonEmpty>
      <EuiButtonEmpty
        data-test-subj={`_dynamicColoring_addStop`}
        iconType="sortable"
        color="primary"
        aria-label={i18n.translate('xpack.lens.dynamicColoring.customPalette.addColorStop', {
          defaultMessage: 'Reverse colors',
        })}
        size="xs"
        flush="left"
        onClick={() => {
          setColorRanges(reversePalette(colorRanges));
        }}
      >
        {i18n.translate('xpack.lens.dynamicColoring.customPalette.addColorStop', {
          defaultMessage: 'Reverse colors',
        })}
      </EuiButtonEmpty>
    </>
  );
}
