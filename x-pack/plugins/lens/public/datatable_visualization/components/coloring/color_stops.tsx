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
  EuiButtonGroup,
} from '@elastic/eui';
import { ColorStop, DEFAULT_COLOR } from './constants';
import { getDataMinMax, getStepValue, isValidColor } from './utils';
import { TooltipWrapper } from '../../../shared_components';
import { useDebounceWithOptions } from '../../../indexpattern_datasource/operations/definitions/helpers';

interface CustomPropsForm {
  colorStops: ColorStop[];
  onChange: (colorStops: ColorStop[]) => void;
  rangeType: 'number' | 'percent';
  dataBounds: { min: number; max: number };
}
export const CustomStops = ({ colorStops, onChange, rangeType, dataBounds }: CustomPropsForm) => {
  const shouldEnableDelete = colorStops.length > 2;
  const remappedControlStops = colorStops;

  const [onBlurOption, setOnBlur] = useState('row');

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
          <EuiFlexItem
            onBlur={(e: FocusEvent<HTMLDivElement>) => {
              if (onBlurOption === 'block') {
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
                    [...localColorStops].sort(({ stop: stopA }, { stop: stopB }) => stopA - stopB)
                  );
                }
              }
            }}
          >
            {remappedControlStops.map(({ color, stop }, index) => {
              const prevStopValue = localColorStops[index - 1]?.stop ?? -Infinity;
              const stopValue = localColorStops[index]?.stop ?? stop;
              const colorValue = localColorStops[index]?.color ?? color;
              const nextStopValue =
                localColorStops[index + 1]?.stop ?? colorStops[index + 1]?.stop ?? Infinity;

              const errorMessages = [];
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
                  onBlur={(e: FocusEvent<HTMLDivElement>) => {
                    if (onBlurOption === 'row') {
                      // sort the stops when the focus leaves the row container
                      const shouldSort = stopValue > nextStopValue || prevStopValue > stopValue;
                      const isFocusStillInContent = (e.currentTarget as Node)?.contains(
                        e.relatedTarget as Node
                      );
                      if (shouldSort && !isFocusStillInContent) {
                        setLocalColorStops(
                          [...localColorStops].sort(
                            ({ stop: stopA }, { stop: stopB }) => stopA - stopB
                          )
                        );
                      }
                    }
                  }}
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
                          if (onBlurOption === 'input') {
                            if (
                              prevStopValue > Number(newStopString) ||
                              Number(newStopString) > nextStopValue
                            ) {
                              newColorStops.sort(
                                ({ stop: stopA }, { stop: stopB }) => stopA - stopB
                              );
                            }
                          }
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
                const { max } = getDataMinMax(rangeType, dataBounds);
                const step = getStepValue(colorStops, newColorStops, max);
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
      <EuiFormRow label={'Sort on blur:'} display="rowCompressed">
        <EuiButtonGroup
          isFullWidth
          legend={'Sort on blur:'}
          data-test-subj="lnsDatatable_dynamicColoring_custom_range_groups"
          buttonSize="compressed"
          options={[
            {
              id: `input`,
              label: 'on Input',
            },
            {
              id: `row`,
              label: 'on Row',
            },
            {
              id: `block`,
              label: 'on Block',
            },
          ]}
          idSelected={onBlurOption}
          onChange={(id) => {
            // TODO: remove this once chosen the onBlur option
            setOnBlur(id);
          }}
        />
      </EuiFormRow>
    </EuiFlexItem>
  );
};
