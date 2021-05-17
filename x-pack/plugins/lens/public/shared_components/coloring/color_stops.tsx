/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
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
} from '@elastic/eui';
import { DEFAULT_COLOR } from './constants';
import { getDataMinMax, getStepValue, isValidColor } from './utils';
import { TooltipWrapper } from '../index';
import { useDebounceWithOptions } from '../../indexpattern_datasource/operations/definitions/helpers';
import { ColorStop } from './types';

export interface CustomStopsProps {
  colorStops: ColorStop[];
  onChange: (colorStops: ColorStop[]) => void;
  rangeType: 'number' | 'percent';
  dataBounds: { min: number; max: number };
  reverse?: boolean;
  'data-test-prefix': string;
}
export const CustomStops = ({
  colorStops,
  onChange,
  rangeType,
  dataBounds,
  reverse,
  ['data-test-prefix']: dataTestPrefix,
}: CustomStopsProps) => {
  const [localColorStops, setLocalColorStops] = useState<Array<{ color: string; stop: string }>>(
    colorStops.map(({ color, stop }) => ({ color, stop: String(stop) }))
  );
  const [sortedReason, setSortReason] = useState<string>('');
  const shouldEnableDelete = localColorStops.length > 2;

  const [popoverInFocus, setPopoverInFocus] = useState<boolean>(false);

  useDebounceWithOptions(
    () => {
      const areStopsValid = localColorStops.every(({ color, stop }, i) => {
        const numberStop = Number(stop);
        const prevNumberStop = Number(localColorStops[i - 1]?.stop ?? -Infinity);
        return isValidColor(color) && !Number.isNaN(numberStop) && numberStop > prevNumberStop;
      });
      if (areStopsValid) {
        onChange(localColorStops.map(({ color, stop }) => ({ color, stop: Number(stop) })));
      }
    },
    { skipFirstRender: true },
    256,
    [localColorStops]
  );

  useEffect(() => {
    setLocalColorStops(colorStops.map(({ color, stop }) => ({ color, stop: String(stop) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reverse]);

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
        {localColorStops.map(({ color, stop }, index) => {
          const prevStopValue = Number(localColorStops[index - 1]?.stop ?? -Infinity);
          const nextStopValue = Number(localColorStops[index + 1]?.stop ?? Infinity);

          return (
            <EuiFlexItem
              key={index}
              data-test-subj={`${dataTestPrefix}_dynamicColoring_stop_row_${index}`}
              onBlur={(e: FocusEvent<HTMLDivElement>) => {
                // sort the stops when the focus leaves the row container
                const shouldSort = Number(stop) > nextStopValue || prevStopValue > Number(stop);
                const isFocusStillInContent =
                  (e.currentTarget as Node)?.contains(e.relatedTarget as Node) || popoverInFocus;
                if (shouldSort && !isFocusStillInContent) {
                  setLocalColorStops(
                    [...localColorStops].sort(
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
                      newColorStops[index] = { color: colorStops[index].color, stop };
                      setLocalColorStops(newColorStops);
                    }
                  }}
                >
                  <EuiColorPicker
                    key={stop}
                    onChange={(newColor) => {
                      const newColorStops = [...localColorStops];
                      newColorStops[index] = { color: newColor, stop };
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
                        newColorStops[index] = { color: colorStops[index].color, stop };
                        setLocalColorStops(newColorStops);
                      }
                    }}
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
