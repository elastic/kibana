/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import {
  EuiFormRow,
  EuiSwitch,
  htmlIdGenerator,
  EuiButtonGroup,
  EuiFieldNumber,
  EuiRange,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PalettePicker } from './palette_picker';
import { TooltipWrapper } from '../../shared_components';
import { CustomPaletteParams } from '../expression';
import { useDebounceWithOptions } from '../../indexpattern_datasource/operations/definitions/helpers';

import './palette_configuration.scss';
import {
  areStopsUpToDate,
  getCurrentMinMax,
  getPaletteColors,
  mergePaletteParams,
  remapForDisplay,
  remapStopsByNewInterval,
  reversePalette,
} from './coloring/utils';
import {
  CUSTOM_PALETTE,
  defaultParams,
  DEFAULT_COLOR,
  DEFAULT_COLOR_STEPS,
  DEFAULT_CUSTOM_PROGRESSION,
  DEFAULT_CUSTOM_STEPS,
  DEFAULT_PROGRESSION,
  MAX_COLOR_STEPS,
  MIN_COLOR_STEPS,
  RequiredPaletteParamTypes,
} from './coloring/constants';
import { CustomStops } from './coloring/color_stops';

const idPrefix = htmlIdGenerator()();

export function applyPaletteParams(
  palettes: PaletteRegistry,
  activePalette: PaletteOutput<CustomPaletteParams>,
  { forDisplay }: { forDisplay?: boolean } = {}
) {
  // make a copy of it as they have to be manipulated later on
  let paletteColorRepresentation = getPaletteColors(palettes, activePalette?.params || {});

  // shifting is a specific subtask for custom palettes in fixed mode when have to be visualized
  // on the EuiColorDisplay component: see https://github.com/elastic/eui/issues/4664
  if (forDisplay) {
    paletteColorRepresentation = remapForDisplay(
      paletteColorRepresentation,
      activePalette?.params || {}
    );
  }

  if (activePalette?.params?.reverse && paletteColorRepresentation) {
    paletteColorRepresentation = reversePalette(paletteColorRepresentation);
  }
  return {
    colorStops: paletteColorRepresentation,
    mode: activePalette?.params?.progression ?? DEFAULT_PROGRESSION,
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
  dataBounds: { min: number; max: number };
}) {
  const { min: minStopValue, max: maxStopValue } = getCurrentMinMax(activePalette.params);
  const [minLocalValue, setMinLocalValue] = useState<string>(
    String(activePalette.params?.rangeMin ?? minStopValue ?? dataBounds.min)
  );

  const [maxLocalValue, setMaxLocalValue] = useState<string>(
    String(activePalette.params?.rangeMax ?? maxStopValue ?? dataBounds.max)
  );

  const { colorStops } = applyPaletteParams(palettes, activePalette);
  const rangeType = activePalette.params?.rangeType ?? defaultParams.rangeType;
  const isAutoRange = rangeType === 'auto';
  const isMaxMinValid = Number(minLocalValue) < Number(maxLocalValue);
  const progressionType = activePalette.params?.progression ?? defaultParams.progression;
  const isCustomPalette = activePalette?.params?.name === CUSTOM_PALETTE;

  const showStepsInput =
    (!isCustomPalette && progressionType !== 'gradient') ||
    (isCustomPalette && progressionType === DEFAULT_CUSTOM_PROGRESSION);

  const controlStops =
    (activePalette?.params?.reverse
      ? reversePalette(activePalette?.params?.controlStops)
      : activePalette?.params?.controlStops) || [];

  useDebounceWithOptions(
    () => {
      setPalette(
        mergePaletteParams(activePalette, {
          rangeMin: Number(minLocalValue),
          rangeMax: Number(maxLocalValue),
        })
      );
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

        // exit if the interval is not valid
        if (newInterval < 0) {
          return;
        }

        const newControlColorStops = remapStopsByNewInterval(controlStops || [], {
          newInterval,
          newMin: Number(min),
        });

        // return a palette object with the new stops + controlStops remapped
        return mergePaletteParams(activePalette, {
          // ...paramsToMerge,
          stops:
            progressionType !== DEFAULT_CUSTOM_PROGRESSION
              ? newControlColorStops
              : getPaletteColors(palettes, {
                  ...activePalette.params,
                  controlStops: newControlColorStops,
                }),
          controlStops: newControlColorStops,
          steps:
            progressionType === DEFAULT_CUSTOM_PROGRESSION
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
          id: `${idPrefix}stepped`,
          label: i18n.translate('xpack.lens.table.dynamicColoring.progression.stepped', {
            defaultMessage: 'Stepped',
          }),
          'data-test-subj': 'lnsDatatable_dynamicColoring_progression_groups_stepped',
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
  ];

  let safeColorStops = controlStops;
  if (isAutoRange && !areStopsUpToDate(controlStops, dataBounds)) {
    safeColorStops = remapStopsByNewInterval(controlStops, {
      newInterval: dataBounds.max - dataBounds.min,
      newMin: dataBounds.min,
    });
  }

  return (
    <>
      <PalettePicker
        data-test-subj="lnsDatatable_dynamicColoring_palette_picker"
        palettes={palettes}
        activePalette={activePalette}
        setPalette={(newPalette) => {
          const isNewPaletteCustom = newPalette.name === CUSTOM_PALETTE;
          const newParams = {
            ...activePalette.params,
            name: newPalette.name,
            steps: isNewPaletteCustom ? DEFAULT_CUSTOM_STEPS : defaultParams.steps,
          };

          const stops = getPaletteColors(
            palettes,
            newParams,
            isNewPaletteCustom
              ? // pick the previous palette to calculate init colors in custom mode
                { prevPalette: activePalette.name }
              : undefined
          );
          setPalette({
            ...newPalette,
            params: {
              ...newParams,
              progression:
                !isNewPaletteCustom && progressionType === DEFAULT_CUSTOM_PROGRESSION
                  ? DEFAULT_PROGRESSION
                  : isNewPaletteCustom && progressionType === DEFAULT_PROGRESSION
                  ? DEFAULT_CUSTOM_PROGRESSION
                  : progressionType,
              stops,
              // because of stepped custom palette we need to store two different set of stops
              controlStops: !isNewPaletteCustom ? [] : stops,
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
              String(dataBounds?.min),
              String(dataBounds?.max)
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
            const newRangeType = id.replace(idPrefix, '') as RequiredPaletteParamTypes['rangeType'];
            const isPercent = newRangeType === 'percent';
            const paramsToUpdate = updateRangeValues(
              String(isPercent ? defaultParams.rangeMin : dataBounds?.min ?? minLocalValue),
              String(isPercent ? defaultParams.rangeMax : dataBounds?.max ?? maxLocalValue)
            ) || { params: {} };
            setPalette(
              mergePaletteParams(activePalette, {
                ...paramsToUpdate.params,
                rangeType: newRangeType,
              })
            );
          }}
        />
      </EuiFormRow>
      {!isCustomPalette && (
        <>
          <EuiFormRow
            data-test-subj="lnsDatatable_dynamicColoring_min_range_label"
            label={
              <>
                <EuiIcon
                  className="lnsPalettePanel__colorIndicator"
                  color={firstColorStop.color}
                  type="stopFilled"
                  aria-label={i18n.translate(
                    'xpack.lens.table.dynamicColoring.range.minStopColor',
                    {
                      defaultMessage: 'Color for the minimum value: {hex}',
                      values: {
                        hex: firstColorStop.color,
                      },
                    }
                  )}
                />
                {i18n.translate('xpack.lens.table.dynamicColoring.range.minStop', {
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
              tooltipContent={i18n.translate(
                'xpack.lens.table.dynamicColoring.rangeDisabled.tooltip',
                {
                  defaultMessage:
                    'This range value cannot be modified while the auto define range setting is enabled.',
                }
              )}
            >
              <EuiFieldNumber
                data-test-subj="lnsDatatable_dynamicColoring_min_range"
                value={isAutoRange ? dataBounds.min : minLocalValue}
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
                    'xpack.lens.table.dynamicColoring.range.maxStopColor',
                    {
                      defaultMessage: 'Color for the maximum value: {hex}',
                      values: {
                        hex: lastColorStop.color,
                      },
                    }
                  )}
                />
                {i18n.translate('xpack.lens.table.dynamicColoring.range.maxStop', {
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
              tooltipContent={i18n.translate(
                'xpack.lens.table.dynamicColoring.rangeDisabled.tooltip',
                {
                  defaultMessage:
                    'This range value cannot be modified while the auto define range setting is enabled.',
                }
              )}
            >
              <EuiFieldNumber
                data-test-subj="lnsDatatable_dynamicColoring_max_range"
                value={isAutoRange ? dataBounds.min : maxLocalValue}
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
        </>
      )}
      {isCustomPalette ? (
        <CustomStops
          key={rangeType}
          controlStops={safeColorStops}
          rangeType={rangeType}
          onChange={(stops) => {
            return setPalette(
              mergePaletteParams(activePalette, {
                stops:
                  progressionType !== DEFAULT_CUSTOM_PROGRESSION
                    ? stops
                    : getPaletteColors(palettes, { ...activePalette.params, controlStops: stops }),
                controlStops: stops,
                steps:
                  progressionType === DEFAULT_CUSTOM_PROGRESSION
                    ? activePalette.params!.steps!
                    : (stops || []).length,
              })
            );
          }}
        />
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
            ) as RequiredPaletteParamTypes['progression'];
            const steps =
              isCustomPalette && newProgressionType !== 'stepped'
                ? controlStops?.length || DEFAULT_CUSTOM_STEPS
                : activePalette.params?.steps || DEFAULT_COLOR_STEPS;
            setPalette(
              mergePaletteParams(activePalette, {
                progression: newProgressionType,
                steps,
                stops:
                  progressionType !== 'stepped' && activePalette.params?.stops
                    ? activePalette.params.stops
                    : getPaletteColors(palettes, { ...activePalette.params, steps }),
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
                  stops: getPaletteColors(palettes, {
                    ...activePalette.params,
                    steps: Number(currentTarget.value),
                  }),
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
