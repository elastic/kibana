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
  EuiFormRow,
  EuiFieldNumber,
  EuiColorPicker,
  EuiButtonIcon,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
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
}
export const CustomStops = ({ colorStops, onChange, rangeType, dataBounds }: CustomStopsProps) => {
  const shouldEnableDelete = colorStops.length > 2;
  const remappedControlStops = colorStops;

  const [localColorStops, setLocalColorStops] = useState<Array<{ color: string; stop: string }>>(
    colorStops.map(({ color, stop }) => ({ color, stop: String(stop) }))
  );

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

  return (
    <EuiFlexItem data-test-subj={`lnsDatatable_dynamicColoring_custom_stops`}>
      <EuiFormRow display="row">
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem
            onBlur={(e: FocusEvent<HTMLDivElement>) => {
              // sort the stops when the focus leaves the block container
              const shouldSort = localColorStops.some(({ stop }, index) => {
                if (index === 0) {
                  return stop > localColorStops[index + 1].stop;
                }
                if (index === localColorStops.length - 1) {
                  return stop < localColorStops[index - 1].stop;
                }
                return (
                  stop < localColorStops[index - 1].stop || stop > localColorStops[index + 1].stop
                );
              });
              const isFocusStillInContent = (e.currentTarget as Node)?.contains(
                e.relatedTarget as Node
              );
              if (shouldSort && !isFocusStillInContent) {
                setLocalColorStops(
                  [...localColorStops].sort(
                    ({ stop: stopA }, { stop: stopB }) => Number(stopA) - Number(stopB)
                  )
                );
              }
            }}
          >
            {remappedControlStops.map(({ color, stop }, index) => {
              const stopValue = localColorStops[index]?.stop ?? stop;
              const colorValue = localColorStops[index]?.color ?? color;

              const errorMessages = [];
              // do not show color error messages if number field is already in error
              if (!isValidColor(colorValue) && errorMessages.length === 0) {
                errorMessages.push(
                  i18n.translate('xpack.lens.table.dynamicColoring.customPalette.hexWarningLabel', {
                    defaultMessage: 'Color must provide a valid hex value',
                  })
                );
              }
              return (
                <EuiFormRow
                  key={index}
                  display="rowCompressed"
                  isInvalid={Boolean(errorMessages.length)}
                  error={errorMessages[0]}
                >
                  <EuiFlexGroup gutterSize="xs">
                    <EuiFlexItem>
                      <EuiFieldNumber
                        compressed
                        data-test-subj={`lnsDatatable_dynamicColoring_stop_value_${index}`}
                        value={stopValue}
                        min={-Infinity}
                        onChange={({ target }) => {
                          const newStopString = target.value.trim();
                          const newColorStops = [...localColorStops];
                          newColorStops[index] = {
                            color: colorValue,
                            stop: newStopString,
                          };
                          setLocalColorStops(newColorStops);
                        }}
                        append={rangeType === 'percent' ? '%' : undefined}
                        aria-label={i18n.translate(
                          'xpack.lens.table.dynamicColoring.customPalette.stopAriaLabel',
                          {
                            defaultMessage: 'Stop {index}',
                            values: {
                              index: index + 1,
                            },
                          }
                        )}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiColorPicker
                        key={stop}
                        onChange={(newColor) => {
                          const newColorStops = [...localColorStops];
                          newColorStops[index] = { color: newColor, stop: stopValue };
                          setLocalColorStops(newColorStops);
                        }}
                        secondaryInputDisplay="top"
                        color={color}
                        isInvalid={!isValidColor(color)}
                        showAlpha
                        compressed
                        data-test-subj={`lnsDatatable_dynamicColoring_stop_color_${index}`}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <TooltipWrapper
                        tooltipContent={i18n.translate(
                          'xpack.lens.table.dynamicColoring.customPalette.deleteButtonDisabled',
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
                            'xpack.lens.table.dynamicColoring.customPalette.deleteButtonAriaLabel',
                            {
                              defaultMessage: 'Delete',
                            }
                          )}
                          title={i18n.translate(
                            'xpack.lens.table.dynamicColoring.customPalette.deleteButtonLabel',
                            {
                              defaultMessage: 'Delete',
                            }
                          )}
                          onClick={() => {
                            const newColorStops = localColorStops.filter((_, i) => i !== index);
                            setLocalColorStops(newColorStops);
                          }}
                          data-test-subj={`lnsDatatable_dynamicColoring_removeStop_${index}`}
                          isDisabled={!shouldEnableDelete}
                        />
                      </TooltipWrapper>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFormRow>
              );
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiFormRow display="columnCompressed">
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="lnsDatatable_dynamicColoring_addStop"
              iconType="plusInCircle"
              color="primary"
              aria-label={i18n.translate(
                'xpack.lens.table.dynamicColoring.customPalette.addColorStop',
                {
                  defaultMessage: 'Add color stop',
                }
              )}
              onClick={() => {
                const newColorStops = [...localColorStops];
                const length = newColorStops.length;
                const { max } = getDataMinMax(rangeType, dataBounds);
                const step = getStepValue(
                  colorStops,
                  newColorStops.map(({ color, stop }) => ({ color, stop: Number(stop) })),
                  max
                );
                const newStop = step + Number(localColorStops[length - 1].stop);
                newColorStops.push({
                  color: DEFAULT_COLOR,
                  stop: String(newStop),
                });
                setLocalColorStops(newColorStops);
              }}
            >
              {i18n.translate('xpack.lens.table.dynamicColoring.customPalette.addColorStop', {
                defaultMessage: 'Add color stop',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem />
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiFlexItem>
  );
};
