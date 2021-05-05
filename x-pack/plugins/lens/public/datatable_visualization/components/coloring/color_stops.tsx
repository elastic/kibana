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
import { isValidColor } from './utils';
import { TooltipWrapper } from '../../../shared_components';
import { useDebounceWithOptions } from '../../../indexpattern_datasource/operations/definitions/helpers';

function shouldRoundDigits(value: number) {
  return value > 1;
}

interface CustomPropsForm {
  controlStops: ColorStop[];
  onChange: (controlStops: ColorStop[]) => void;
  rangeType: 'number' | 'percent';
}
export const CustomStops = ({ controlStops, onChange, rangeType }: CustomPropsForm) => {
  const shouldEnableDelete = controlStops.length > 2;
  const remappedControlStops = controlStops;

  const [colorStops, setColorStops] = useState<ColorStop[]>(controlStops);

  useDebounceWithOptions(
    () => {
      if (
        colorStops.every(
          ({ color, stop }, i) =>
            isValidColor(color) &&
            !Number.isNaN(stop) &&
            stop > (colorStops[i - 1]?.stop ?? -Infinity)
        )
      ) {
        onChange(colorStops);
      }
    },
    { skipFirstRender: true },
    256,
    [colorStops]
  );

  return (
    <EuiFlexItem>
      <EuiFormRow display="row">
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem>
            {remappedControlStops.map(({ color, stop }, index) => {
              const stopValue = colorStops[index]?.stop ?? stop;
              const colorValue = colorStops[index]?.color ?? color;
              const nextStopValue =
                colorStops[index + 1]?.stop ?? controlStops[index + 1]?.stop ?? Infinity;

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
                  key={`${color}-${stop}`}
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
                          const newColorStops = [...controlStops];
                          newColorStops[index] = {
                            color: colorValue,
                            stop: Number(newStopString),
                          };
                          setColorStops(newColorStops);
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
                          const newColorStops = [...controlStops];
                          newColorStops[index] = { color: newColor, stop: stopValue };
                          setColorStops(newColorStops);
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
                            const newColorStops = controlStops.filter((_, i) => i !== index);
                            setColorStops(newColorStops);
                          }}
                          data-test-subj="lnsDatatable_dynamicColoring_removeStop"
                          disabled={!shouldEnableDelete}
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
                const newColorStops = [...controlStops];
                const length = newColorStops.length;
                // workout the steps from the last 2 items
                const dataStep =
                  newColorStops[length - 1].stop - newColorStops[length - 2].stop || 1;
                const step = shouldRoundDigits(dataStep) ? Math.round(dataStep) : dataStep;
                newColorStops.push({
                  color: DEFAULT_COLOR,
                  stop: controlStops[length - 1].stop + step,
                });
                setColorStops(newColorStops);
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
