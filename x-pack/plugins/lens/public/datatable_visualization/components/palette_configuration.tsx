/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import {
  EuiFormRow,
  EuiSwitch,
  htmlIdGenerator,
  EuiButtonGroup,
  EuiFieldNumber,
  EuiColorStops,
  EuiRange,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PalettePicker } from './palette_picker';
import { TooltipWrapper } from '../../shared_components';
import { CustomPaletteParams } from '../expression';
import { useDebounceWithOptions } from '../../indexpattern_datasource/operations/definitions/helpers';

import './palette_configuration.scss';

const idPrefix = htmlIdGenerator()();

type RequiredParamTypes = Required<CustomPaletteParams>;

const DEFAULT_MIN_STOP = 0;
const DEFAULT_MAX_STOP = 100;
const MAX_COLOR_STEPS = 12;
const MIN_COLOR_STEPS = 1;
const DEFAULT_COLOR_STEPS = 10;
export const defaultParams: RequiredParamTypes = {
  name: 'positive',
  reverse: false,
  rangeType: 'auto',
  rangeMin: DEFAULT_MIN_STOP,
  rangeMax: DEFAULT_MAX_STOP,
  progression: 'fixed',
  stops: [],
  steps: DEFAULT_COLOR_STEPS,
  controlStops: [],
};

function shiftPalette(stops: Required<CustomPaletteParams>['stops']) {
  // shift everything right and add an additional stop at the end
  const result = stops.map((entry, i, array) => ({
    ...entry,
    stop: i + 1 < array.length ? array[i + 1].stop : DEFAULT_MAX_STOP,
  }));
  if (stops[stops.length - 1].stop === DEFAULT_MAX_STOP) {
    // pop out the last value (to void any conflict)
    result.pop();
  }
  return result;
}

function remapStopsByNewInterval(
  controlStops: Required<CustomPaletteParams>['stops'],
  { newInterval, oldInterval }: { newInterval: number; oldInterval: number },
  { prevMin, newMin }: { prevMin: number; newMin: number }
) {
  return (controlStops || []).map(({ color, stop }) => {
    return {
      color,
      stop: newMin + ((stop - prevMin) * newInterval) / oldInterval,
    };
  });
}

function getPaletteColors(
  palettes: PaletteRegistry,
  activePaletteParams: CustomPaletteParams,
  // used to customize color resolution
  { prevPalette, shouldShift }: { prevPalette?: string; shouldShift?: boolean } = {}
) {
  const isCustomPalette = activePaletteParams.name === 'custom';
  // compute the stopFactor based on steps value. Fallback to 3 steps if not defined yet
  const steps = activePaletteParams.steps ?? isCustomPalette ? 3 : DEFAULT_COLOR_STEPS;
  const visualSteps = isCustomPalette ? steps - 1 : steps;
  const interval =
    (activePaletteParams.rangeMax ?? DEFAULT_MAX_STOP) -
    (activePaletteParams.rangeMin ?? DEFAULT_MIN_STOP);

  const stopFactor = interval / visualSteps;
  // If stops are already declared just return them
  if (
    activePaletteParams?.stops != null &&
    // make sure to regenerate if the user changes number of steps
    activePaletteParams.stops.length === activePaletteParams.steps
  ) {
    return shouldShift ? shiftPalette(activePaletteParams.stops) : activePaletteParams.stops;
  }

  const { stops, ...otherParams } = activePaletteParams || {};

  const params: Omit<CustomPaletteParams, 'stops'> & {
    stepped?: boolean;
    stops?: number[];
    colors?: string[];
  } = {
    ...otherParams,
  };
  if (activePaletteParams?.progression === 'stepped') {
    params.stepped = true;
    params.colors = activePaletteParams.controlStops?.map(({ color }) => color);
    params.stops = activePaletteParams.controlStops?.map(({ stop }) => stop);
  }
  const colorStops = palettes
    .get(prevPalette || activePaletteParams?.name || defaultParams.name)
    .getCategoricalColors(activePaletteParams?.steps || defaultParams.steps, params)
    .map((color, i) => ({ color, stop: i * stopFactor }));

  return shouldShift ? shiftPalette(colorStops) : colorStops;
}

function reversePalette(paletteColorRepresentation: CustomPaletteParams['stops'] = []) {
  const stops = paletteColorRepresentation.map(({ stop }) => stop);
  return paletteColorRepresentation
    .map(({ color }, i) => ({
      color,
      stop: stops[paletteColorRepresentation.length - i - 1],
    }))
    .reverse();
}

export function applyPaletteParams(
  palettes: PaletteRegistry,
  activePalette: PaletteOutput<CustomPaletteParams>,
  { forDisplay }: { forDisplay?: boolean } = {}
) {
  const paletteDisplayMode = activePalette?.params?.progression ?? 'fixed';

  const isCustomPalette = activePalette?.params?.name === 'custom';

  // make a copy of it as they have to be manipulated later on
  let paletteColorRepresentation = getPaletteColors(palettes, activePalette?.params || {}, {
    // shifting is a specific subtask for custom palettes in fixed mode when have to be visualized
    // on the EuiColorDisplay component: see https://github.com/elastic/eui/issues/4664
    shouldShift: forDisplay && isCustomPalette && paletteDisplayMode !== 'gradient',
  }).map(({ color, stop }) => ({ color, stop }));

  if (activePalette?.params?.reverse && paletteColorRepresentation) {
    paletteColorRepresentation = reversePalette(paletteColorRepresentation);
  }
  return { colorStops: paletteColorRepresentation, mode: paletteDisplayMode };
}

function mergePaletteParams(
  activePalette: PaletteOutput<CustomPaletteParams>,
  newParams: Partial<RequiredParamTypes>
): PaletteOutput<CustomPaletteParams> {
  return {
    ...activePalette,
    params: {
      ...activePalette.params,
      ...newParams,
    },
  };
}

export function CustomizablePalette({
  palettes,
  activePalette,
  setPalette,
  dataBounds,
}: {
  palettes: PaletteRegistry;
  activePalette: PaletteOutput<CustomPaletteParams>;
  setPalette: (palette: PaletteOutput<CustomPaletteParams>) => void;
  dataBounds: { min: number; max: number } | undefined;
}) {
  const [minLocalValue, setMinLocalValue] = useState<string>(
    String(activePalette.params?.rangeMin ?? dataBounds?.min ?? DEFAULT_MIN_STOP)
  );

  const [maxLocalValue, setMaxLocalValue] = useState<string>(
    String(activePalette.params?.rangeMax ?? dataBounds?.max ?? DEFAULT_MAX_STOP)
  );

  const { colorStops } = applyPaletteParams(palettes, activePalette);
  const rangeType = activePalette.params?.rangeType ?? defaultParams.rangeType;
  const isAutoRange = rangeType === 'auto';
  const isMaxMinValid = Number(minLocalValue) < Number(maxLocalValue);
  const progressionType = activePalette.params?.progression ?? defaultParams.progression;
  const isCustomPalette = activePalette?.params?.name === 'custom';

  const showStepsInput =
    (!isCustomPalette && progressionType !== 'gradient') ||
    (isCustomPalette && progressionType === 'stepped');

  const controlStops = activePalette?.params?.reverse
    ? reversePalette(activePalette?.params?.controlStops)
    : activePalette?.params?.controlStops;

  // be on the safe side here: min and max should be consistent with stops
  // when user deletes to type it can be fast and reach a point where min > max o similar
  // so fallback to min/max from the current stops for the time being
  const safeColorStopsMin = isMaxMinValid ? Number(minLocalValue) : colorStops[0].stop;
  const safeColorStopsMax = isMaxMinValid
    ? Number(maxLocalValue)
    : colorStops[colorStops.length - 1].stop;

  useDebounceWithOptions(
    () => {
      if (!isAutoRange) {
        setPalette(
          mergePaletteParams(activePalette, {
            rangeMin: Number(minLocalValue),
            rangeMax: Number(maxLocalValue),
          })
        );
      }
    },
    { skipFirstRender: true },
    256,
    [minLocalValue, maxLocalValue]
  );

  const updateRangeValues = useCallback(
    (min: string, max: string) => {
      // update both min/max
      setMinLocalValue(min);
      setMaxLocalValue(max);

      if (isCustomPalette && controlStops) {
        // remap color stops and control stops now to be consistent on the new range
        const newInterval = Number(max) - Number(min);
        // do not use the local min/max as they may be invalid
        // use the control stops values which are always valid
        const oldInterval = controlStops[controlStops.length - 1].stop - controlStops[0].stop;

        // exit if the interval is not valid
        if (newInterval < 0) {
          return;
        }

        const newControlColorStops = remapStopsByNewInterval(
          controlStops || [],
          { newInterval, oldInterval },
          { prevMin: controlStops[0].stop, newMin: Number(min) }
        );

        // return a palette object with the new stops + controlStops remapped
        return mergePaletteParams(activePalette, {
          stops:
            progressionType !== 'stepped'
              ? newControlColorStops
              : getPaletteColors(
                  palettes,
                  { ...activePalette.params, controlStops: newControlColorStops },
                  {
                    shouldShift: false,
                  }
                ),
          controlStops: newControlColorStops,
          steps:
            progressionType === 'stepped'
              ? activePalette.params!.steps!
              : (newControlColorStops || []).length,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minLocalValue, maxLocalValue, progressionType, controlStops, activePalette, setPalette]
  );

  const [firstColorStop] = colorStops;
  const lastColorStop = colorStops[colorStops.length - 1];

  // The fixed type is named "Stepped" when in predefined palette, or Fixed for custom palettes
  const progressionTypeLabel = [
    isCustomPalette
      ? {
          id: `${idPrefix}fixed`,
          label: i18n.translate('xpack.lens.table.dynamicColoring.progression.fixedCustom', {
            defaultMessage: 'Fixed',
          }),
          'data-test-subj': 'lnsDatatable_dynamicColoring_progression_groups_fixed',
        }
      : {
          id: `${idPrefix}fixed`,
          label: i18n.translate('xpack.lens.table.dynamicColoring.progression.fixedPrefilled', {
            defaultMessage: 'Stepped',
          }),
          'data-test-subj': 'lnsDatatable_dynamicColoring_progression_groups_fixed',
        },
    {
      id: `${idPrefix}gradient`,
      label: i18n.translate('xpack.lens.table.dynamicColoring.progression.gradient', {
        defaultMessage: 'Gradient',
      }),
      'data-test-subj': 'lnsDatatable_dynamicColoring_progression_groups_gradient',
    },
  ].concat(
    isCustomPalette
      ? [
          {
            id: `${idPrefix}stepped`,
            label: i18n.translate('xpack.lens.table.dynamicColoring.progression.stepped', {
              defaultMessage: 'Stepped',
            }),
            'data-test-subj': 'lnsDatatable_dynamicColoring_progression_groups_stepped',
          },
        ]
      : []
  );

  return (
    <>
      <PalettePicker
        data-test-subj="lnsDatatable_dynamicColoring_palette_picker"
        palettes={palettes}
        activePalette={activePalette}
        setPalette={(newPalette) => {
          const newParams = {
            ...activePalette.params,
            name: newPalette.name,
            stops: undefined,
            steps: newPalette.name === 'custom' ? 3 : defaultParams.steps,
          };

          const stops = getPaletteColors(
            palettes,
            newParams,
            newPalette.name === 'custom'
              ? // pick the previous palette to calculate init colors in custom mode
                { prevPalette: activePalette.name, shouldShift: false }
              : undefined
          );
          setPalette({
            ...newPalette,
            params: {
              ...newParams,
              progression:
                newPalette.name !== 'custom' && newParams.progression === 'stepped'
                  ? 'fixed'
                  : newParams.progression,
              stops,
              // because of stepped custom palette we need to store two different set of stops
              controlStops: newPalette.name !== 'custom' ? [] : stops,
            },
          });
        }}
        showCustomPalette
        showDynamicColorOnly
      />
      <EuiFormRow
        label={i18n.translate('xpack.lens.table.dynamicColoring.autoRange.label', {
          defaultMessage: 'Auto define range',
        })}
        display="columnCompressedSwitch"
      >
        <EuiSwitch
          data-test-subj="lnsDatatable_dynamicColoring_auto_range"
          checked={isAutoRange}
          onChange={(newValue) => {
            const isNewAutoRange = newValue.target.checked;
            // update the stops first
            const moreParams = updateRangeValues(
              String(isNewAutoRange ? DEFAULT_MIN_STOP : dataBounds?.min),
              String(isNewAutoRange ? DEFAULT_MAX_STOP : dataBounds?.max)
            ) || { params: {} };
            // now update with the range type
            setPalette(
              mergePaletteParams(activePalette, {
                ...moreParams.params,
                // override the range data
                rangeType: isNewAutoRange ? 'auto' : 'number',
              })
            );
          }}
          compressed
          showLabel={false}
          label={i18n.translate('xpack.lens.table.dynamicColoring.autoRange.label', {
            defaultMessage: 'Auto define range',
          })}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.lens.table.dynamicColoring.stopValue.label', {
          defaultMessage: 'Color stop value',
        })}
        display="columnCompressed"
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.table.dynamicColoring.stopValue.label', {
            defaultMessage: 'Color stop value',
          })}
          data-test-subj="lnsDatatable_dynamicColoring_custom_range_groups"
          name="dynamicColoringStopValue"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}number`,
              label: i18n.translate('xpack.lens.table.dynamicColoring.stopValue.number', {
                defaultMessage: 'Number',
              }),
              'data-test-subj': 'lnsDatatable_dynamicColoring_stopValue_groups_number',
            },
            {
              id: `${idPrefix}percent`,
              label: i18n.translate('xpack.lens.table.dynamicColoring.stopValue.percent', {
                defaultMessage: 'Percent',
              }),
              'data-test-subj': 'lnsDatatable_dynamicColoring_stopValue_groups_percent',
            },
          ]}
          idSelected={
            isAutoRange ? `${idPrefix}number` : `${idPrefix}${activePalette.params?.rangeType}`
          }
          isDisabled={isAutoRange}
          onChange={(id) => {
            const newRangeType = id.replace(idPrefix, '') as RequiredParamTypes['rangeType'];
            const isPercent = newRangeType === 'percent';
            const paramsToUpdate = updateRangeValues(
              String(isPercent ? 0 : dataBounds?.min ?? minLocalValue),
              String(isPercent ? 100 : dataBounds?.max ?? maxLocalValue)
            );
            setPalette(
              mergePaletteParams(activePalette, {
                ...paramsToUpdate,
                rangeType: newRangeType,
              })
            );
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        data-test-subj="lnsDatatable_dynamicColoring_min_range_label"
        label={
          <>
            <EuiIcon
              className="lnsPalettePanel__colorIndicator"
              color={firstColorStop.color}
              type="stopFilled"
              aria-label={i18n.translate(
                'xpack.lens.table.dynamicColoring.progression.minStopColor',
                {
                  defaultMessage: 'Color for the minimum value: {hex}',
                  values: {
                    hex: firstColorStop.color,
                  },
                }
              )}
            />
            {i18n.translate('xpack.lens.table.dynamicColoring.progression.minStop', {
              defaultMessage: 'Min color stop',
            })}
          </>
        }
        display="columnCompressed"
        isInvalid={!isMaxMinValid}
        error={
          isMaxMinValid
            ? []
            : i18n.translate('xpack.lens.table.dynamicColoring.range.minError', {
                defaultMessage: 'Min cannot be higher than max',
              })
        }
      >
        <TooltipWrapper
          condition={isAutoRange}
          tooltipContent={i18n.translate('xpack.lens.table.dynamicColoring.rangeDisabled.tooltip', {
            defaultMessage:
              'This range value cannot be modified while the auto define range setting is enabled.',
          })}
        >
          <EuiFieldNumber
            data-test-subj="lnsDatatable_dynamicColoring_min_range"
            value={minLocalValue}
            onChange={({ target }) => {
              const paramsToUpdate = updateRangeValues(target.value.trim(), maxLocalValue);
              if (paramsToUpdate) {
                setPalette(paramsToUpdate);
              }
            }}
            append={rangeType === 'number' ? undefined : '%'}
            isInvalid={!isMaxMinValid}
            disabled={isAutoRange}
          />
        </TooltipWrapper>
      </EuiFormRow>
      <EuiFormRow
        data-test-subj="lnsDatatable_dynamicColoring_max_range_label"
        label={
          <>
            <EuiIcon
              className="lnsPalettePanel__colorIndicator"
              color={lastColorStop.color}
              type="stopFilled"
              aria-label={i18n.translate(
                'xpack.lens.table.dynamicColoring.progression.maxStopColor',
                {
                  defaultMessage: 'Color for the maximum value: {hex}',
                  values: {
                    hex: lastColorStop.color,
                  },
                }
              )}
            />
            {i18n.translate('xpack.lens.table.dynamicColoring.progression.maxStop', {
              defaultMessage: 'Max color stop',
            })}
          </>
        }
        display="columnCompressed"
        isInvalid={!isMaxMinValid}
        error={
          isMaxMinValid
            ? []
            : i18n.translate('xpack.lens.table.dynamicColoring.range.maxError', {
                defaultMessage: 'Max cannot be lower than min',
              })
        }
      >
        <TooltipWrapper
          condition={isAutoRange}
          tooltipContent={i18n.translate('xpack.lens.table.dynamicColoring.rangeDisabled.tooltip', {
            defaultMessage:
              'This range value cannot be modified while the auto define range setting is enabled.',
          })}
        >
          <EuiFieldNumber
            data-test-subj="lnsDatatable_dynamicColoring_max_range"
            value={maxLocalValue}
            onChange={({ target }) => {
              const paramsToUpdate = updateRangeValues(minLocalValue, target.value.trim());
              if (paramsToUpdate) {
                setPalette(paramsToUpdate);
              }
            }}
            append={rangeType === 'number' ? undefined : '%'}
            isInvalid={!isMaxMinValid}
            disabled={isAutoRange}
          />
        </TooltipWrapper>
      </EuiFormRow>
      {isCustomPalette ? (
        <EuiFormRow
          label={i18n.translate('xpack.lens.table.dynamicColoring.customPalette.label', {
            defaultMessage: 'Custom palette',
          })}
          display="columnCompressed"
        >
          <EuiColorStops
            showAlpha
            data-test-subj="lnsDatatable_dynamicColoring_progression_custom_stops"
            label={i18n.translate('xpack.lens.table.dynamicColoring.customPalette.label', {
              defaultMessage: 'Custom palette',
            })}
            valueInputProps={
              rangeType === 'number'
                ? {
                    'data-test-subj': 'lnsDatatable_dynamicColoring_progression_custom_stops_value',
                  }
                : {
                    'data-test-subj': 'lnsDatatable_dynamicColoring_progression_custom_stops_value',
                    append: '%',
                  }
            }
            onChange={(colorSteps) => {
              const stops =
                // if stops are less than 2, restore the previous stops
                colorSteps && colorSteps.length > 1
                  ? colorSteps
                      // sort them to make it consistent for reverse
                      .sort(({ stop: stopA }, { stop: stopB }) => stopA - stopB)
                  : controlStops!;
              // the minimum and maximum stops must be at min and max value,
              // so make sure to restore them in case the user changes them
              stops[0].stop = Number(minLocalValue);
              stops[stops.length - 1].stop = Number(maxLocalValue);
              return setPalette(
                mergePaletteParams(activePalette, {
                  stops:
                    progressionType !== 'stepped'
                      ? stops
                      : getPaletteColors(
                          palettes,
                          { ...activePalette.params, controlStops: stops },
                          {
                            shouldShift: false,
                          }
                        ),
                  controlStops: stops,
                  steps:
                    progressionType === 'stepped'
                      ? activePalette.params!.steps!
                      : (stops || []).length,
                })
              );
            }}
            colorStops={controlStops || colorStops || []}
            min={safeColorStopsMin}
            max={safeColorStopsMax}
            stopType={progressionType}
            stepNumber={activePalette?.params?.steps}
          />
        </EuiFormRow>
      ) : null}
      <EuiFormRow
        label={i18n.translate('xpack.lens.table.dynamicColoring.progression.label', {
          defaultMessage: 'Color progression',
        })}
        display="columnCompressed"
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.table.dynamicColoring.progression.label', {
            defaultMessage: 'Color progression',
          })}
          data-test-subj="lnsDatatable_dynamicColoring_progression_groups"
          name="dynamicColoringProgressionValue"
          buttonSize="compressed"
          options={progressionTypeLabel}
          idSelected={`${idPrefix}${progressionType}`}
          onChange={(id) => {
            const newProgressionType = id.replace(
              idPrefix,
              ''
            ) as RequiredParamTypes['progression'];
            setPalette(
              mergePaletteParams(activePalette, {
                progression: newProgressionType,
              })
            );
          }}
        />
      </EuiFormRow>
      {showStepsInput && (
        <EuiFormRow
          label={i18n.translate('xpack.lens.table.dynamicColoring.progression.stops.label', {
            defaultMessage: 'Color steps',
          })}
          display="columnCompressed"
        >
          <EuiRange
            data-test-subj="lnsDatatable_dynamicColoring_progression_steps"
            value={activePalette?.params?.steps || DEFAULT_COLOR_STEPS}
            onChange={({
              currentTarget,
            }: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>) => {
              setPalette(
                mergePaletteParams(activePalette, {
                  stops: getPaletteColors(
                    palettes,
                    { ...activePalette.params, steps: Number(currentTarget.value) },
                    {
                      shouldShift: false,
                    }
                  ),
                  steps: Number(currentTarget.value),
                })
              );
            }}
            min={MIN_COLOR_STEPS}
            max={MAX_COLOR_STEPS}
            compressed
            showValue
          />
        </EuiFormRow>
      )}
      <EuiFormRow
        label={i18n.translate('xpack.lens.table.dynamicColoring.reverse.label', {
          defaultMessage: 'Reverse colors',
        })}
        display="columnCompressedSwitch"
      >
        <EuiSwitch
          data-test-subj="lnsDatatable_dynamicColoring_reverse"
          checked={Boolean(activePalette.params?.reverse ?? defaultParams.reverse)}
          onChange={(newValue) =>
            setPalette(mergePaletteParams(activePalette, { reverse: newValue.target.checked }))
          }
          compressed
          showLabel={false}
          label={i18n.translate('xpack.lens.table.dynamicColoring.reverse.label', {
            defaultMessage: 'Reverse colors',
          })}
        />
      </EuiFormRow>
    </>
  );
}
