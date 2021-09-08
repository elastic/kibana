/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback, useMemo } from 'react';
import type { FocusEvent } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFieldNumber,
  EuiColorPicker,
  EuiButtonIcon,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiSpacer,
  EuiScreenReaderOnly,
  htmlIdGenerator,
} from '@elastic/eui';
import useUnmount from 'react-use/lib/useUnmount';
import { DEFAULT_COLOR } from './constants';
import { getDataMinMax, getStepValue, isValidColor } from './utils';
import { TooltipWrapper, useDebouncedValue } from '../index';
import type { ColorStop, CustomPaletteParams } from '../../../common';

const idGeneratorFn = htmlIdGenerator();

function areStopsValid(colorStops: Array<{ color: string; stop: string }>) {
  return colorStops.every(
    ({ color, stop }) => isValidColor(color) && !Number.isNaN(parseFloat(stop))
  );
}

function shouldSortStops(colorStops: Array<{ color: string; stop: string | number }>) {
  return colorStops.some(({ stop }, i) => {
    const numberStop = Number(stop);
    const prevNumberStop = Number(colorStops[i - 1]?.stop ?? -Infinity);
    return numberStop < prevNumberStop;
  });
}

export interface CustomStopsProps {
  colorStops: ColorStop[];
  onChange: (colorStops: ColorStop[]) => void;
  dataBounds: { min: number; max: number };
  paletteConfiguration: CustomPaletteParams | undefined;
  'data-test-prefix': string;
}
export const CustomStops = ({
  colorStops,
  onChange,
  paletteConfiguration,
  dataBounds,
  ['data-test-prefix']: dataTestPrefix,
}: CustomStopsProps) => {
  const onChangeWithValidation = useCallback(
    (newColorStops: Array<{ color: string; stop: string }>) => {
      const areStopsValuesValid = areStopsValid(newColorStops);
      const shouldSort = shouldSortStops(newColorStops);
      if (areStopsValuesValid && !shouldSort) {
        onChange(newColorStops.map(({ color, stop }) => ({ color, stop: Number(stop) })));
      }
    },
    [onChange]
  );

  const memoizedValues = useMemo(() => {
    return colorStops.map(({ color, stop }, i) => ({
      color,
      stop: String(stop),
      id: idGeneratorFn(),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteConfiguration?.name, paletteConfiguration?.reverse, paletteConfiguration?.rangeType]);

  const { inputValue: localColorStops, handleInputChange: setLocalColorStops } = useDebouncedValue({
    onChange: onChangeWithValidation,
    value: memoizedValues,
  });
  const [sortedReason, setSortReason] = useState<string>('');
  const shouldEnableDelete = localColorStops.length > 2;

  const [popoverInFocus, setPopoverInFocus] = useState<boolean>(false);

  // refresh on unmount:
  // the onChange logic here is a bit different than the one above as it has to actively sort if required
  useUnmount(() => {
    const areStopsValuesValid = areStopsValid(localColorStops);
    const shouldSort = shouldSortStops(localColorStops);
    if (areStopsValuesValid && shouldSort) {
      onChange(
        localColorStops
          .map(({ color, stop }) => ({ color, stop: Number(stop) }))
          .sort(({ stop: stopA }, { stop: stopB }) => Number(stopA) - Number(stopB))
      );
    }
  });

  const rangeType = paletteConfiguration?.rangeType || 'percent';

  return (
    <>
      {sortedReason ? (
        <EuiScreenReaderOnly>
          <p aria-live="assertive">
            {i18n.translate('xpack.lens.dynamicColoring.customPalette.sortReason', {
              defaultMessage: 'Color stops have been sorted due to new stop value {value}',
              values: {
                value: sortedReason,
              },
            })}
          </p>
        </EuiScreenReaderOnly>
      ) : null}

      <EuiFlexGroup
        data-test-subj={`${dataTestPrefix}_dynamicColoring_custom_stops`}
        direction="column"
        gutterSize="s"
      >
        {localColorStops.map(({ color, stop, id }, index) => {
          const prevStopValue = Number(localColorStops[index - 1]?.stop ?? -Infinity);
          const nextStopValue = Number(localColorStops[index + 1]?.stop ?? Infinity);

          return (
            <EuiFlexItem
              key={id}
              data-test-subj={`${dataTestPrefix}_dynamicColoring_stop_row_${index}`}
              onBlur={(e: FocusEvent<HTMLDivElement>) => {
                // sort the stops when the focus leaves the row container
                const shouldSort = Number(stop) > nextStopValue || prevStopValue > Number(stop);
                const isFocusStillInContent =
                  (e.currentTarget as Node)?.contains(e.relatedTarget as Node) || popoverInFocus;
                const hasInvalidColor = !isValidColor(color);
                if ((shouldSort && !isFocusStillInContent) || hasInvalidColor) {
                  // replace invalid color with previous valid one
                  const lastValidColor = hasInvalidColor ? colorStops[index].color : color;
                  const localColorStopsCopy = localColorStops.map((item, i) =>
                    i === index ? { color: lastValidColor, stop, id } : item
                  );
                  setLocalColorStops(
                    localColorStopsCopy.sort(
                      ({ stop: stopA }, { stop: stopB }) => Number(stopA) - Number(stopB)
                    )
                  );
                  setSortReason(stop);
                }
              }}
            >
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem>
                  <EuiFieldNumber
                    compressed
                    data-test-subj={`${dataTestPrefix}_dynamicColoring_stop_value_${index}`}
                    value={stop}
                    min={-Infinity}
                    onChange={({ target }) => {
                      const newStopString = target.value.trim();
                      const newColorStops = [...localColorStops];
                      newColorStops[index] = {
                        color,
                        stop: newStopString,
                        id,
                      };
                      setLocalColorStops(newColorStops);
                    }}
                    append={rangeType === 'percent' ? '%' : undefined}
                    aria-label={i18n.translate(
                      'xpack.lens.dynamicColoring.customPalette.stopAriaLabel',
                      {
                        defaultMessage: 'Stop {index}',
                        values: {
                          index: index + 1,
                        },
                      }
                    )}
                  />
                </EuiFlexItem>

                <EuiFlexItem
                  data-test-subj={`${dataTestPrefix}_dynamicColoring_stop_color_${index}`}
                  onBlur={() => {
                    // make sure that the popover is closed
                    if (color === '' && !popoverInFocus) {
                      const newColorStops = [...localColorStops];
                      newColorStops[index] = { color: colorStops[index].color, stop, id };
                      setLocalColorStops(newColorStops);
                    }
                  }}
                >
                  <EuiColorPicker
                    key={stop}
                    onChange={(newColor) => {
                      const newColorStops = [...localColorStops];
                      newColorStops[index] = { color: newColor, stop, id };
                      setLocalColorStops(newColorStops);
                    }}
                    secondaryInputDisplay="top"
                    color={color}
                    isInvalid={!isValidColor(color)}
                    showAlpha
                    compressed
                    onFocus={() => setPopoverInFocus(true)}
                    onBlur={() => {
                      setPopoverInFocus(false);
                      if (color === '') {
                        const newColorStops = [...localColorStops];
                        newColorStops[index] = { color: colorStops[index].color, stop, id };
                        setLocalColorStops(newColorStops);
                      }
                    }}
                    placeholder=" "
                  />
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <TooltipWrapper
                    tooltipContent={i18n.translate(
                      'xpack.lens.dynamicColoring.customPalette.deleteButtonDisabled',
                      {
                        defaultMessage:
                          'This color stop cannot be deleted, as two or more stops are required',
                      }
                    )}
                    condition={!shouldEnableDelete}
                  >
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
                        const newColorStops = localColorStops.filter((_, i) => i !== index);
                        setLocalColorStops(newColorStops);
                      }}
                      data-test-subj={`${dataTestPrefix}_dynamicColoring_removeStop_${index}`}
                      isDisabled={!shouldEnableDelete}
                    />
                  </TooltipWrapper>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiButtonEmpty
        data-test-subj={`${dataTestPrefix}_dynamicColoring_addStop`}
        iconType="plusInCircle"
        color="primary"
        aria-label={i18n.translate('xpack.lens.dynamicColoring.customPalette.addColorStop', {
          defaultMessage: 'Add color stop',
        })}
        size="xs"
        flush="left"
        onClick={() => {
          const newColorStops = [...localColorStops];
          const length = newColorStops.length;
          const { max } = getDataMinMax(rangeType, dataBounds);
          const step = getStepValue(
            colorStops,
            newColorStops.map(({ color, stop }) => ({ color, stop: Number(stop) })),
            max
          );
          const prevColor = localColorStops[length - 1].color || DEFAULT_COLOR;
          const newStop = step + Number(localColorStops[length - 1].stop);
          newColorStops.push({
            color: prevColor,
            stop: String(newStop),
            id: idGeneratorFn(),
          });
          setLocalColorStops(newColorStops);
        }}
      >
        {i18n.translate('xpack.lens.dynamicColoring.customPalette.addColorStop', {
          defaultMessage: 'Add color stop',
        })}
      </EuiButtonEmpty>
    </>
  );
};
