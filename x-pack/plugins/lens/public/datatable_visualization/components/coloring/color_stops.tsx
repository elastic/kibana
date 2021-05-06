/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
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
import { ColorStop, DEFAULT_COLOR } from './constants';
import { getDataMinMax, isValidColor } from './utils';
import { TooltipWrapper } from '../../../shared_components';
import { useDebounceWithOptions } from '../../../indexpattern_datasource/operations/definitions/helpers';

function shouldRoundDigits(value: number) {
  return value > 1;
}

interface CustomPropsForm {
  colorStops: ColorStop[];
  onChange: (colorStops: ColorStop[]) => void;
  rangeType: 'number' | 'percent';
  dataBounds: { min: number; max: number };
}
export const CustomStops = ({ colorStops, onChange, rangeType, dataBounds }: CustomPropsForm) => {
  const shouldEnableDelete = colorStops.length > 2;
  const remappedControlStops = colorStops;

  const [localColorStops, setLocalColorStops] = useState<ColorStop[]>(colorStops);

  useDebounceWithOptions(
    () => {
      if (
        localColorStops.every(
          ({ color, stop }, i) =>
            isValidColor(color) &&
            !Number.isNaN(stop) &&
            stop > (localColorStops[i - 1]?.stop ?? -Infinity)
        )
      ) {
        onChange(localColorStops);
      }
    },
    { skipFirstRender: true },
    256,
    [localColorStops]
  );

  return (
    <EuiFlexItem>
      <EuiFormRow display="row">
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem>
            {remappedControlStops.map(({ color, stop }, index) => {
              const stopValue = localColorStops[index]?.stop ?? stop;
              const colorValue = localColorStops[index]?.color ?? color;
              const nextStopValue =
                localColorStops[index + 1]?.stop ?? colorStops[index + 1]?.stop ?? Infinity;

              const errorMessages = [];
              if (stopValue > nextStopValue) {
                errorMessages.push(
                  i18n.translate('xpack.lens.table.dynamicColoring.customPalette.stopError', {
                    defaultMessage: 'Stop value {index} cannot be higher than Stop {nextIndex}',
                    values: { index: index + 1, nextIndex: index + 2 },
                  })
                );
              }
              // do not show color error messages if number field is already in error
              if (!isValidColor(colorValue) && errorMessages.length === 0) {
                errorMessages.push(
                  i18n.translate('xpack.maps.styles.colorStops.hexWarningLabel', {
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
                        data-test-subj={`lnsDatatable_dynamicColoring_stop_${index}`}
                        value={stopValue}
                        onChange={({ target }) => {
                          const newStopString = target.value.trim();
                          const newColorStops = [...colorStops];
                          newColorStops[index] = {
                            color: colorValue,
                            stop: Number(newStopString),
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
                        isInvalid={stopValue > nextStopValue}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiColorPicker
                        key={stop}
                        onChange={(newColor) => {
                          const newColorStops = [...colorStops];
                          newColorStops[index] = { color: newColor, stop: stopValue };
                          setLocalColorStops(newColorStops);
                        }}
                        secondaryInputDisplay="top"
                        color={color}
                        isInvalid={!isValidColor(color)}
                        showAlpha
                        compressed
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
                            const newColorStops = colorStops.filter((_, i) => i !== index);
                            setLocalColorStops(newColorStops);
                          }}
                          data-test-subj="lnsDatatable_dynamicColoring_removeStop"
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
                const newColorStops = [...colorStops];
                const length = newColorStops.length;
                const { max } = getDataMinMax(rangeType, dataBounds);
                // workout the steps from the last 2 items
                const dataStep =
                  newColorStops[length - 1].stop - newColorStops[length - 2].stop || 1;
                let step = shouldRoundDigits(dataStep) ? Math.round(dataStep) : dataStep;
                if (max < colorStops[length - 1].stop + step) {
                  const diffToMax = max - colorStops[length - 1].stop;
                  // if the computed step goes way out of bound, fallback to 1, otherwise reach max
                  step = diffToMax > 0 ? diffToMax : 1;
                }
                newColorStops.push({
                  color: DEFAULT_COLOR,
                  stop: colorStops[length - 1].stop + step,
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
