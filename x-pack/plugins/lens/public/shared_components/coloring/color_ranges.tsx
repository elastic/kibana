/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
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
  EuiButtonEmpty,
  EuiSpacer,
  EuiTextColor,
} from '@elastic/eui';
import { ValueMaxIcon } from '../../assets/value_max';
import { ValueMinIcon } from '../../assets/value_min';
import { RelatedIcon } from '../../assets/related';
import { DistributeEquallyIcon } from '../../assets/distribute_equally';
import { getDataMinMax, getStepValue, isValidColor, roundValue, getAutoValues } from './utils';
import type { CustomPaletteParamsConfig, ColorStop } from '../../../common';
import { useDebouncedValue, TooltipWrapper } from '../index';
import { DEFAULT_COLOR } from './constants';

const idGeneratorFn = htmlIdGenerator();
export interface ColorRange {
  color: string;
  start: number;
  end: number;
  id?: string;
}

export interface ColorRangesProps {
  colorRanges: ColorRange[];
  paletteConfiguration: CustomPaletteParamsConfig | undefined;
  onChange: (
    colorStops: ColorStop[],
    upperMax: number,
    autoValue: CustomPaletteParamsConfig['autoValue']
  ) => void;
  dataBounds: { min: number; max: number };
  'data-test-prefix': string;
}

function areStopsValid(colorStops: Array<{ color: string; stop: number }>) {
  return colorStops.every(({ color, stop }) => !Number.isNaN(stop) && isValidColor(color));
}

function reversePalette(colorRanges: ColorRange[]) {
  return colorRanges
    .map(({ color }, i) => ({
      id: idGeneratorFn(),
      color,
      start: colorRanges[colorRanges.length - i - 1].start,
      end: colorRanges[colorRanges.length - i - 1].end,
    }))
    .reverse();
}

export function ColorRanges(props: ColorRangesProps) {
  const { colorRanges, onChange, dataBounds, paletteConfiguration } = props;
  const dataTestPrefix = props['data-test-prefix'];
  const [isValid, setValid] = useState(true);
  const [popoverInFocus, setPopoverInFocus] = useState<boolean>(false);

  let autoValue = paletteConfiguration?.autoValue ?? 'none';
  const isDisabledStart = ['min', 'all'].includes(autoValue!);
  const isDisabledEnd = ['max', 'all'].includes(autoValue!);

  const onChangeWithValidation = (newColorRanges: ColorRange[]) => {
    const upperMin = ['min', 'all'].includes(autoValue!)
      ? -Infinity
      : Number(newColorRanges[0].start);
    const colorStops = newColorRanges.map((colorRange, i) => {
      return {
        color: colorRange.color,
        stop: i === 0 ? upperMin : colorRange.start && Number(colorRange.start),
      };
    });
    const upperMax = ['max', 'all'].includes(autoValue!)
      ? Infinity
      : Number(newColorRanges[newColorRanges.length - 1].end);
    if (areStopsValid(colorStops)) {
      onChange(colorStops, upperMax, autoValue);
    }
  };
  const memoizedValues = useMemo(() => {
    return colorRanges.map(({ color, start, end }, i) => ({
      color,
      start,
      end,
      id: idGeneratorFn(),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteConfiguration?.name, paletteConfiguration?.reverse, paletteConfiguration?.rangeType]);

  const { inputValue: localColorRanges, handleInputChange: setColorRanges } = useDebouncedValue({
    onChange: onChangeWithValidation,
    value: memoizedValues,
  });
  const rangeType = paletteConfiguration?.rangeType || 'percent';
  const shouldDisableAdd = Boolean(
    paletteConfiguration?.maxSteps && localColorRanges.length >= paletteConfiguration?.maxSteps
  );

  const validateLastRange = (isLast: boolean) => {
    const lastRange = localColorRanges[localColorRanges.length - 1];
    if (lastRange.start > lastRange.end) {
      if (isLast && isValid) {
        setValid(false);
      }
    } else if (!isValid) {
      setValid(true);
    }
  };

  const getColorRangeElem = (colorRange: ColorRange, index: number, isLast = false) => {
    const value = isLast ? colorRange.end : colorRange.start;
    const showDelete = index !== 0 && !isLast;
    const indexPostfix = isLast ? index + 1 : index;
    const showEdit = !showDelete && isLast ? isDisabledEnd : isDisabledStart;
    const isDisabled = isLast ? isDisabledEnd : index === 0 ? isDisabledStart : false;
    const isInvalid = (!isValid && isLast) || value === undefined || Number.isNaN(value);
    const prevStartValue = localColorRanges[index - 1]?.start ?? -Infinity;
    const nextStartValue = localColorRanges[index + 1]?.start ?? Infinity;

    return (
      <EuiFlexItem
        key={colorRange.id}
        data-test-subj={`${dataTestPrefix}_dynamicColoring_range_row_${indexPostfix}`}
        onBlur={(e: FocusEvent<HTMLDivElement>) => {
          const shouldSort = colorRange.start > nextStartValue || prevStartValue > colorRange.start;
          const isFocusStillInContent =
            (e.currentTarget as Node)?.contains(e.relatedTarget as Node) || popoverInFocus;

          if (!shouldSort) {
            validateLastRange(isLast);
          }

          if (shouldSort && !isFocusStillInContent) {
            const maxValue = localColorRanges[localColorRanges.length - 1].end;
            let newColorRanges = [...localColorRanges].sort(
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

            validateLastRange(isLast);

            setColorRanges(newColorRanges);
          }
        }}
      >
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem
            grow={false}
            onBlur={() => {
              // make sure that the popover is closed
              if (!colorRange.color && !popoverInFocus) {
                const newColorRanges = [...localColorRanges];
                newColorRanges[index].color = colorRanges[index].color;
                setColorRanges(newColorRanges);
              }
            }}
            data-test-subj={`${dataTestPrefix}_dynamicColoring_range_color_${indexPostfix}`}
          >
            {isLast ? (
              <EuiIcon type={RelatedIcon} size="l" />
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
                onFocus={() => setPopoverInFocus(true)}
                onBlur={() => {
                  setPopoverInFocus(false);
                  if (colorRange.color === '') {
                    const newColorRanges = [...localColorRanges];
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
              data-test-subj={`${dataTestPrefix}_dynamicColoring_range_value_${indexPostfix}`}
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
                  <span className="euiFormLabel">&#8804;</span>
                ) : (
                  <span className="euiFormLabel">&#8805;</span>
                )
              }
              aria-label={i18n.translate(
                'xpack.lens.dynamicColoring.customPalette.rangeAriaLabel',
                {
                  defaultMessage: 'Range {index}',
                  values: {
                    index: indexPostfix + 1,
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
                data-test-subj={`${dataTestPrefix}_dynamicColoring_removeColorRange_${indexPostfix}`}
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
                    let newValue;
                    const { max } = getDataMinMax(rangeType, dataBounds);
                    const colorStops = localColorRanges.map(({ color, start }) => ({
                      color,
                      stop: Number(start),
                    }));
                    const step = roundValue(getStepValue(colorStops, colorStops, max));
                    if (isLast) {
                      newValue = localColorRanges[index].start + step;
                    } else {
                      newValue = localColorRanges[index].end - step;
                    }
                    if (isLast) {
                      autoValue = autoValue === 'all' ? 'min' : 'none';
                    } else {
                      autoValue = autoValue === 'all' ? 'max' : 'none';
                    }
                    localColorRanges[index][isLast ? 'end' : 'start'] = roundValue(newValue);
                    setColorRanges([...localColorRanges]);
                  }}
                  data-test-subj={`${dataTestPrefix}_dynamicColoring_editValue_${indexPostfix}`}
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
                        first: localColorRanges[1].start,
                        preLast: localColorRanges[localColorRanges.length - 2].start,
                        last: localColorRanges[localColorRanges.length - 1].start,
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

                    localColorRanges[index][isLast ? 'end' : 'start'] = newValue;
                    setColorRanges([...localColorRanges]);
                  }}
                  data-test-subj={`${dataTestPrefix}_dynamicColoring_autoDetect_${
                    isLast ? 'maximum' : 'minimum'
                  }`}
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
      <EuiFlexGroup
        data-test-subj={`${dataTestPrefix}_dynamicColoring_custom_color_ranges`}
        direction="column"
        gutterSize="s"
      >
        {localColorRanges.map((colorRange, index) => {
          return getColorRangeElem(colorRange, index, false);
        })}
        {getColorRangeElem(
          localColorRanges[localColorRanges.length - 1],
          localColorRanges.length - 1,
          true
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="spaceAround" gutterSize="s">
        <TooltipWrapper
          tooltipContent={i18n.translate(
            'xpack.lens.dynamicColoring.customPalette.maximumStepsApplied',
            {
              defaultMessage: `You've applied the maximum number of steps`,
            }
          )}
          condition={shouldDisableAdd}
          position="top"
          delay="regular"
        >
          <EuiButtonEmpty
            data-test-subj={`${dataTestPrefix}_dynamicColoring_addColorRange`}
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
                id: idGeneratorFn(),
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
        </TooltipWrapper>
        <EuiButtonEmpty
          data-test-subj={`${dataTestPrefix}_dynamicColoring_reverseColors`}
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
          data-test-subj={`${dataTestPrefix}_dynamicColoring_distributeEqually`}
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
                id: idGeneratorFn(),
                color: colorRange.color,
                start: roundValue(start + (step * 100 * index) / 100),
                end:
                  index === localColorRanges.length - 1
                    ? end
                    : roundValue(start + (step * 100 * (index + 1)) / 100),
              };
            });
            setColorRanges(newRanges);
          }}
        >
          {i18n.translate('xpack.lens.dynamicColoring.customPalette.distributeEqually', {
            defaultMessage: 'Distribute equally',
          })}
        </EuiButtonEmpty>
      </EuiFlexGroup>
    </>
  );
}
