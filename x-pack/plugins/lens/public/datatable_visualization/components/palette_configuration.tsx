/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import {
  EuiFormRow,
  EuiSwitch,
  htmlIdGenerator,
  EuiButtonGroup,
  EuiRange,
  EuiSuperSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PalettePicker } from './palette_picker';
import { CustomPaletteParams } from '../expression';

import './palette_configuration.scss';
import {
  getPaletteColors,
  mergePaletteParams,
  remapStopsByNewInterval,
  reversePalette,
} from './coloring/utils';
import {
  CUSTOM_PALETTE,
  defaultParams,
  DEFAULT_COLOR_STEPS,
  DEFAULT_CUSTOM_STEPS,
  DEFAULT_MAX_STOP,
  DEFAULT_MIN_STOP,
  MAX_COLOR_STEPS,
  MIN_COLOR_STEPS,
  RequiredPaletteParamTypes,
  STEPPED_PROGRESSION,
} from './coloring/constants';
import { CustomStops } from './coloring/color_stops';

const idPrefix = htmlIdGenerator()();

function getSwitchToCustomParams(
  palettes: PaletteRegistry,
  activePalette: PaletteOutput<CustomPaletteParams>,
  newParams: CustomPaletteParams,
  dataBounds: { min: number; max: number }
) {
  // if it's already a custom palette just return the params
  if (activePalette?.params?.name === CUSTOM_PALETTE) {
    const stops = getPaletteColors(
      palettes,
      {
        steps: DEFAULT_CUSTOM_STEPS,
        ...activePalette.params,
        ...newParams,
      },
      {
        dataBounds,
      }
    );
    return mergePaletteParams(activePalette, { ...newParams, stops });
  }
  // prepare everything to switch to custom palette
  const newPaletteParams = {
    steps: DEFAULT_CUSTOM_STEPS,
    ...activePalette.params,
    ...newParams,
    name: CUSTOM_PALETTE,
  };

  const stops = getPaletteColors(palettes, newPaletteParams, {
    prevPalette: newPaletteParams.controlStops ? undefined : activePalette.name,
    dataBounds,
  });
  return mergePaletteParams(
    { name: CUSTOM_PALETTE, type: 'palette' },
    {
      ...newPaletteParams,
      stops,
    }
  );
}

export function applyPaletteParams(
  palettes: PaletteRegistry,
  activePalette: PaletteOutput<CustomPaletteParams>,
  dataBounds: { min: number; max: number }
) {
  // make a copy of it as they have to be manipulated later on
  let paletteColorRepresentation = getPaletteColors(palettes, activePalette?.params || {}, {
    dataBounds,
  });

  if (activePalette?.params?.reverse && paletteColorRepresentation) {
    paletteColorRepresentation = reversePalette(paletteColorRepresentation);
  }
  return {
    colorStops: paletteColorRepresentation,
    mode: activePalette?.params?.progression ?? STEPPED_PROGRESSION,
  };
}

function getControlStops(
  palettes: PaletteRegistry,
  controlStops: Required<CustomPaletteParams>['stops'],
  activePalette: PaletteOutput<CustomPaletteParams>,
  dataBounds: { min: number; max: number }
) {
  if (activePalette?.name === CUSTOM_PALETTE) {
    return controlStops;
  }
  // else create a small representation of the current palette.
  const colorStops = getPaletteColors(
    palettes,
    { ...activePalette?.params, steps: 2 },
    { dataBounds }
  )
    // do some rounding here
    .map(({ color, stop }) => ({ color, stop: stop > 1 ? Math.round(stop) : stop }));

  return colorStops.slice(0, 3);
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
  dataBounds: { min: number; max: number };
}) {
  // const { colorStops } = applyPaletteParams(palettes, activePalette);
  const rangeType = activePalette.params?.rangeType ?? defaultParams.rangeType;
  const progressionType = activePalette.params?.progression ?? defaultParams.progression;
  const isCustomPalette = activePalette?.params?.name === CUSTOM_PALETTE;

  const showStepsInput =
    (!isCustomPalette && progressionType !== 'gradient') ||
    (isCustomPalette && progressionType === STEPPED_PROGRESSION);

  const controlStops =
    (activePalette?.params?.reverse
      ? reversePalette(activePalette?.params?.controlStops)
      : activePalette?.params?.controlStops) || [];

  const controlPointsToShow = getControlStops(palettes, controlStops, activePalette, dataBounds);

  return (
    <>
      <div className="lnsPalettePanel__section lnsPalettePanel__section--shaded">
        <EuiFormRow
          display="rowCompressed"
          fullWidth
          label={i18n.translate('xpack.lens.palettePicker.label', {
            defaultMessage: 'Color palette',
          })}
        >
          <PalettePicker
            data-test-subj="lnsDatatable_dynamicColoring_palette_picker"
            palettes={palettes}
            activePalette={activePalette}
            setPalette={(newPalette) => {
              const isNewPaletteCustom = newPalette.name === CUSTOM_PALETTE;
              const newParams = {
                ...activePalette.params,
                name: newPalette.name,
                steps: defaultParams.steps,
              };

              const stops = getPaletteColors(
                palettes,
                newParams,
                isNewPaletteCustom
                  ? // pick the previous palette to calculate init colors in custom mode
                    { prevPalette: activePalette.name, dataBounds }
                  : { dataBounds }
              );
              setPalette({
                ...newPalette,
                params: {
                  ...newParams,
                  progression: progressionType,
                  stops,
                  // because of stepped custom palette we need to store two different set of stops
                  controlStops: !isNewPaletteCustom
                    ? []
                    : getControlStops(palettes, stops, activePalette, dataBounds),
                },
              });
            }}
            showCustomPalette
            showDynamicColorOnly
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.lens.table.dynamicColoring.continuity.label', {
            defaultMessage: 'Color continuity',
          })}
          display="rowCompressed"
        >
          <EuiSuperSelect
            options={[
              {
                value: 'above',
                inputDisplay: i18n.translate(
                  'xpack.lens.table.dynamicColoring.continuity.aboveLabel',
                  {
                    defaultMessage: 'Above range',
                  }
                ),
                'data-test-subj': 'continuity-above',
              },
              {
                value: 'below',
                inputDisplay: i18n.translate(
                  'xpack.lens.table.dynamicColoring.continuity.belowLabel',
                  {
                    defaultMessage: 'Below range',
                  }
                ),
                'data-test-subj': 'continuity-below',
              },
              {
                value: 'all',
                inputDisplay: i18n.translate(
                  'xpack.lens.table.dynamicColoring.continuity.allLabel',
                  {
                    defaultMessage: 'Above and below range',
                  }
                ),
                'data-test-subj': 'continuity-all',
              },
              {
                value: 'none',
                inputDisplay: i18n.translate(
                  'xpack.lens.table.dynamicColoring.continuity.noneLabel',
                  {
                    defaultMessage: 'Within range',
                  }
                ),
                'data-test-subj': 'continuity-none',
              },
            ]}
            valueOfSelected={activePalette.params?.continuity || defaultParams.continuity}
            onChange={(continuity: Required<CustomPaletteParams>['continuity']) =>
              setPalette(
                mergePaletteParams(activePalette, {
                  continuity,
                })
              )
            }
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.lens.table.dynamicColoring.continuity.label', {
            defaultMessage: 'Value type',
          })}
          display="rowCompressed"
        >
          <EuiButtonGroup
            isFullWidth
            legend={i18n.translate('xpack.lens.table.dynamicColoring.stopValue.label', {
              defaultMessage: 'Value type',
            })}
            data-test-subj="lnsDatatable_dynamicColoring_custom_range_groups"
            name="dynamicColoringStopValue"
            buttonSize="compressed"
            options={[
              {
                id: `${idPrefix}percent`,
                label: i18n.translate('xpack.lens.table.dynamicColoring.stopValue.percent', {
                  defaultMessage: 'Percent',
                }),
                'data-test-subj': 'lnsDatatable_dynamicColoring_stopValue_groups_percent',
              },
              {
                id: `${idPrefix}number`,
                label: i18n.translate('xpack.lens.table.dynamicColoring.stopValue.number', {
                  defaultMessage: 'Number',
                }),
                'data-test-subj': 'lnsDatatable_dynamicColoring_stopValue_groups_number',
              },
            ]}
            idSelected={
              activePalette.params?.rangeType
                ? `${idPrefix}${activePalette.params?.rangeType}`
                : `${idPrefix}percent`
            }
            onChange={(id) => {
              const newRangeType = id.replace(
                idPrefix,
                ''
              ) as RequiredPaletteParamTypes['rangeType'];
              const newInterval =
                newRangeType === 'percent'
                  ? DEFAULT_MAX_STOP - DEFAULT_MIN_STOP
                  : dataBounds.max - dataBounds.min;
              const newMin = newRangeType === 'percent' ? DEFAULT_MIN_STOP : dataBounds.min;
              const newControlStops = remapStopsByNewInterval(controlPointsToShow, {
                newInterval,
                newMin,
              }).map(({ color, stop }) => {
                const roundedStop = stop > 1 ? Math.round(stop) : stop;
                return { color, stop: roundedStop };
              });
              const stops = getPaletteColors(
                palettes,
                { ...activePalette.params, controlStops: newControlStops, rangeType: newRangeType },
                { dataBounds }
              );
              setPalette(
                mergePaletteParams(activePalette, {
                  rangeType: newRangeType,
                  controlStops: newControlStops,
                  stops,
                })
              );
            }}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.lens.table.dynamicColoring.customPalette.colorStopsLabel', {
            defaultMessage: 'Color stops',
          })}
        >
          <CustomStops
            key={rangeType}
            controlStops={controlPointsToShow}
            rangeType={rangeType}
            onChange={(stops) => {
              const newParams = getSwitchToCustomParams(
                palettes,
                activePalette,
                {
                  controlStops: stops,
                  steps: activePalette.params!.steps || DEFAULT_COLOR_STEPS,
                },
                dataBounds
              );
              return setPalette(newParams);
            }}
          />
        </EuiFormRow>
      </div>
      <div className="lnsPalettePanel__section">
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
            options={[
              {
                id: `${idPrefix}stepped`,
                label: i18n.translate('xpack.lens.table.dynamicColoring.progression.stepped', {
                  defaultMessage: 'Stepped',
                }),
                'data-test-subj': 'lnsDatatable_dynamicColoring_progression_groups_stepped',
              },
              {
                id: `${idPrefix}gradient`,
                label: i18n.translate('xpack.lens.table.dynamicColoring.progression.gradient', {
                  defaultMessage: 'Gradient',
                }),
                'data-test-subj': 'lnsDatatable_dynamicColoring_progression_groups_gradient',
              },
            ]}
            idSelected={`${idPrefix}${progressionType}`}
            onChange={(id) => {
              const newProgressionType = id.replace(
                idPrefix,
                ''
              ) as RequiredPaletteParamTypes['progression'];
              const steps = activePalette.params?.steps || DEFAULT_COLOR_STEPS;
              const newParams = mergePaletteParams(activePalette, {
                progression: newProgressionType,
                steps,
                stops:
                  progressionType !== STEPPED_PROGRESSION && activePalette.params?.stops
                    ? activePalette.params.stops
                    : getPaletteColors(
                        palettes,
                        { ...activePalette.params, steps },
                        { dataBounds }
                      ),
              });
              setPalette(newParams);
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
                      {
                        ...activePalette.params,
                        steps: Number(currentTarget.value),
                      },
                      { dataBounds }
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
      </div>
    </>
  );
}
