/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import {
  EuiFormRow,
  EuiSwitch,
  htmlIdGenerator,
  EuiButtonGroup,
  EuiFieldNumber,
  EuiColorStops,
  EuiRange,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PalettePicker } from '../../shared_components';
import { CustomPaletteParams } from '../expression';
import { useDebounceWithOptions } from '../../indexpattern_datasource/operations/definitions/helpers';

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
};

function getPaletteColors(
  palettes: PaletteRegistry,
  activePaletteParams?: CustomPaletteParams,
  // used to customize color resolution
  { stopFactor, prevPalette }: { stopFactor: number; prevPalette?: string } = {
    stopFactor: 1,
  }
) {
  // If stops are already declared just return them
  if (
    activePaletteParams?.stops != null &&
    // make sure to regenerate if the user changes number of steps
    activePaletteParams.stops.length === activePaletteParams.steps
  ) {
    return activePaletteParams.stops;
  }
  return palettes
    .get(prevPalette || activePaletteParams?.name || defaultParams.name)
    .getCategoricalColors(
      activePaletteParams?.steps || defaultParams.steps,
      activePaletteParams ?? undefined
    )
    .map((color, i) => ({ color, stop: i * stopFactor }));
}

export function applyPaletteParams(
  palettes: PaletteRegistry,
  activePalette?: PaletteOutput<CustomPaletteParams>
) {
  if (!activePalette) {
    return {};
  }
  // make a copy of it as they have to be manipulated later on
  const paletteColorRepresentation = getPaletteColors(
    palettes,
    activePalette?.params
  ).map(({ color, stop }) => ({ color, stop }));

  const paletteDisplayMode = activePalette?.params?.progression
    ? activePalette?.params?.progression !== 'stepped'
      ? activePalette?.params?.progression
      : 'gradient'
    : 'fixed';

  if (activePalette?.params?.reverse && paletteColorRepresentation) {
    const stops = paletteColorRepresentation.map(({ stop }) => stop);
    paletteColorRepresentation.forEach((colorStop, i) => {
      colorStop.stop = stops[paletteColorRepresentation.length - i - 1];
    });
    paletteColorRepresentation.reverse();
  }
  return { colorStops: paletteColorRepresentation, mode: paletteDisplayMode };
}

function mergePaletteParams(
  activePalette: PaletteOutput<CustomPaletteParams>,
  newParams: Partial<RequiredParamTypes>
) {
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
}: {
  palettes: PaletteRegistry;
  activePalette: PaletteOutput<CustomPaletteParams>;
  setPalette: (palette: PaletteOutput<CustomPaletteParams>) => void;
}) {
  const [minLocalValue, setMinLocalValue] = useState<string>(
    '' + (activePalette.params?.rangeMin ?? DEFAULT_MIN_STOP)
  );

  const [maxLocalValue, setMaxLocalValue] = useState<string>(
    '' + (activePalette.params?.rangeMax ?? DEFAULT_MAX_STOP)
  );

  const { colorStops } = applyPaletteParams(palettes, activePalette);
  const rangeType = activePalette.params?.rangeType ?? defaultParams.rangeType;
  const isAutoRange = rangeType === 'auto';
  const isMaxMinValid = Number(minLocalValue) < Number(maxLocalValue);
  const progressionType = activePalette.params?.progression ?? defaultParams.progression;

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

  return (
    <>
      <PalettePicker
        palettes={palettes}
        activePalette={activePalette}
        setPalette={(newPalette) => {
          const newParams = {
            ...activePalette.params,
            name: newPalette.name,
            stops: undefined,
            steps: newPalette.name === 'custom' ? 3 : defaultParams.steps,
          };
          setPalette({
            ...newPalette,
            params: {
              ...newParams,
              progression:
                newPalette.name !== 'custom' && newParams.progression === 'stepped'
                  ? 'fixed'
                  : newParams.progression,
              stops: getPaletteColors(
                palettes,
                newParams,
                newPalette.name === 'custom'
                  ? // pick the previous palette to calculate init colors in custom mode
                    { stopFactor: 50, prevPalette: activePalette.name }
                  : undefined
              ),
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
          checked={isAutoRange}
          onChange={(newValue) => {
            const isNewAutoRange = newValue.target.checked;
            setPalette(
              mergePaletteParams(activePalette, {
                rangeType: isNewAutoRange ? 'auto' : 'number',
                rangeMax: isNewAutoRange ? undefined : activePalette.params?.rangeMax,
                rangeMin: isNewAutoRange ? undefined : activePalette.params?.rangeMin,
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
          data-test-subj="lnsDatatable_dynamicColoring_stopValue_groups"
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
          idSelected={`${idPrefix}${activePalette.params?.rangeType}`}
          onChange={(id) => {
            const newRangeType = id.replace(idPrefix, '') as RequiredParamTypes['rangeType'];
            setPalette(
              mergePaletteParams(activePalette, {
                rangeType: newRangeType,
                rangeMax: activePalette.params?.rangeMax || defaultParams.rangeMax,
                rangeMin: activePalette.params?.rangeMin || defaultParams.rangeMin,
              })
            );
          }}
        />
      </EuiFormRow>
      {!isAutoRange ? (
        <>
          <EuiFormRow
            label={i18n.translate('xpack.lens.table.dynamicColoring.progression.minStop', {
              defaultMessage: 'Min color stop',
            })}
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
            <EuiFieldNumber
              value={minLocalValue}
              onChange={({ target }) => {
                setMinLocalValue(target.value);
              }}
              append={rangeType === 'percent' ? '%' : undefined}
              isInvalid={!isMaxMinValid}
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.lens.table.dynamicColoring.progression.maxStop', {
              defaultMessage: 'Max color stop',
            })}
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
            <EuiFieldNumber
              value={maxLocalValue}
              onChange={({ target }) => {
                setMaxLocalValue(target.value);
              }}
              append={rangeType === 'percent' ? '%' : undefined}
              isInvalid={!isMaxMinValid}
            />
          </EuiFormRow>
        </>
      ) : null}
      {activePalette.name === 'custom' ? (
        <EuiFormRow
          label={i18n.translate('xpack.lens.table.dynamicColoring.progression.label', {
            defaultMessage: 'Color progression',
          })}
          display="columnCompressed"
        >
          <EuiColorStops
            label="Color progression"
            onChange={(colorSteps) =>
              setPalette(
                mergePaletteParams(activePalette, {
                  stops: (colorSteps || [])
                    // sort them to make it consistent for reverse
                    .sort(({ stop: stopA }, { stop: stopB }) => stopA - stopB),
                  steps: (colorSteps || []).length,
                })
              )
            }
            colorStops={colorStops || []}
            min={0}
            max={100}
            stopType={progressionType === 'stepped' ? 'gradient' : progressionType}
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
          options={[
            {
              id: `${idPrefix}gradient`,
              label: i18n.translate('xpack.lens.table.dynamicColoring.progression.gradient', {
                defaultMessage: 'Gradient',
              }),
              'data-test-subj': 'lnsDatatable_dynamicColoring_progression_groups_gradient',
            },
            {
              id: `${idPrefix}fixed`,
              label: i18n.translate('xpack.lens.table.dynamicColoring.progression.fixed', {
                defaultMessage: 'Fixed',
              }),
              'data-test-subj': 'lnsDatatable_dynamicColoring_progression_groups_fixed',
            },
          ].concat(
            activePalette?.params?.name === 'custom'
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
          )}
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
      {activePalette?.params?.name !== 'custom' && progressionType !== 'gradient' && (
        <EuiFormRow
          label={i18n.translate('xpack.lens.table.dynamicColoring.progression.stops.label', {
            defaultMessage: 'Color stops',
          })}
          display="columnCompressed"
        >
          <EuiRange
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
                      stopFactor: 1,
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
      <EuiFormRow label="Reverse colors" display="columnCompressedSwitch">
        <EuiSwitch
          checked={Boolean(activePalette.params?.reverse ?? defaultParams.reverse)}
          onChange={(newValue) =>
            setPalette(mergePaletteParams(activePalette, { reverse: newValue.target.checked }))
          }
          compressed
          showLabel={false}
          label="Reverse colors"
        />
      </EuiFormRow>
    </>
  );
}
