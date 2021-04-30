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
} from '@elastic/eui';
import { ColorStop, DEFAULT_COLOR } from './constants';
import { isValidColor } from './utils';

interface CustomPropsForm {
  controlStops: ColorStop[];
  onChange: (controlStops: ColorStop[]) => void;
  rangeType: 'number' | 'percent' | 'auto';
}
export const CustomStops = ({ controlStops, onChange, rangeType }: CustomPropsForm) => {
  const shouldShowDeleteIcon = controlStops.length > 1;
  const remappedControlStops = controlStops;

  const [stops, setStops] = useState<number[]>(controlStops.map(({ stop }) => stop));
  const [colors, setColors] = useState<string[]>(controlStops.map(({ color }) => color));

  const updateControlStops = (newColorStops: ColorStop[]) => {
    setStops(newColorStops.map(({ stop }) => stop));
    setColors(newColorStops.map(({ color }) => color));
    if (
      newColorStops.every(
        ({ color, stop }, i) =>
          isValidColor(color) &&
          !Number.isNaN(stop) &&
          stop > (newColorStops[i - 1]?.stop ?? -Infinity)
      )
    ) {
      onChange(newColorStops);
    }
  };

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.table.dynamicColoring.customPalette.colorStopsLabel', {
        defaultMessage: 'Color stops',
      })}
    >
      <EuiFlexGroup alignItems="center" gutterSize="xs">
        <EuiFlexItem grow={false}>
          {remappedControlStops.map(({ color, stop }, index) => {
            let deleteButton;
            if (shouldShowDeleteIcon) {
              const onRemove = () => {
                const newColorStops = controlStops.filter((_, i) => i !== index);
                updateControlStops(newColorStops);
              };
              deleteButton = (
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
                  onClick={onRemove}
                  data-test-subj="lnsDatatable_dynamicColoring_removeStop"
                />
              );
            }
            const actions = (
              <div>
                {deleteButton}
                <EuiButtonIcon
                  data-test-subj="lnsDatatable_dynamicColoring_addStop"
                  iconType="plusInCircle"
                  color="primary"
                  aria-label="Add"
                  title="Add"
                  onClick={() => {
                    const newColorStops = [...controlStops];
                    // put the new stop in the middle
                    const step =
                      (newColorStops[index + 1]?.stop - newColorStops[index].stop) / 2 || 1;
                    newColorStops.splice(index + 1, 0, {
                      color: DEFAULT_COLOR,
                      stop: controlStops[index].stop + step,
                    });
                    updateControlStops(newColorStops);
                  }}
                />
              </div>
            );

            const stopValue = stops[index] ?? stop;
            const nextStopValue = stops[index + 1] ?? controlStops[index + 1]?.stop ?? Infinity;
            const colorValue = colors[index] ?? color;

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
                key={stop}
                display="rowCompressed"
                isInvalid={Boolean(errorMessages.length)}
                error={errorMessages[0]}
              >
                <EuiFlexGroup alignItems="center" gutterSize="xs">
                  <EuiFlexItem grow={false}>
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
                        updateControlStops(newColorStops);
                      }}
                      append={rangeType === 'percent' ? '%' : undefined}
                      disabled={rangeType === 'auto'}
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
                        updateControlStops(newColorStops);
                      }}
                      secondaryInputDisplay="top"
                      color={color}
                      isInvalid={!isValidColor(color)}
                      append={actions}
                      showAlpha
                      compressed
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>
            );
          })}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
