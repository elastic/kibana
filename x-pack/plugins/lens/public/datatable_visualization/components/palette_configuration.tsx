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
  EuiSuperSelect,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PalettePicker } from './palette_picker';

import './palette_configuration.scss';

import { CustomStops } from '../../shared_components/coloring/color_stops';
import {
  defaultParams,
  CUSTOM_PALETTE,
  DEFAULT_COLOR_STEPS,
} from '../../shared_components/coloring/constants';
import {
  CustomPaletteParams,
  RequiredPaletteParamTypes,
} from '../../shared_components/coloring/types';
import {
  getColorStops,
  getPaletteStops,
  mergePaletteParams,
  getDataMinMax,
  roundStopValues,
  remapStopsByNewInterval,
  getSwitchToCustomParams,
  reversePalette,
} from '../../shared_components/coloring/utils';
const idPrefix = htmlIdGenerator()();

/**
 * Some name conventions here:
 * * `displayStops` => It's an additional transformation of `stops` into a [0, N] domain for the EUIPaletteDisplay component.
 * * `stops` => final steps used to table coloring. It is a rightShift of the colorStops
 * * `colorStops` => user's color stop inputs.  Used to compute range min.
 *
 * When the user inputs the colorStops, they are designed to be the initial part of the color segment,
 * so the next stops indicate where the previous stop ends.
 * Both table coloring logic and EuiPaletteDisplay format implementation works differently than our current `colorStops`,
 * by having the stop values at the end of each color segment rather than at the beginning: `stops` values are computed by a rightShift of `colorStops`.
 * EuiPaletteDisplay has an additional requirement as it is always mapped against a domain [0, N]: from `stops` the `displayStops` are computed with
 * some continuity enrichment and a remap against a [0, 100] domain to make the palette component work ok.
 *
 * These naming conventions would be useful to track the code flow in this feature as multiple transformations are happening
 * for a single change.
 */

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
  const rangeType = activePalette.params?.rangeType ?? defaultParams.rangeType;
  const isCurrentPaletteCustom = activePalette.params?.name === CUSTOM_PALETTE;

  const stopsTooltipContent = [
    i18n.translate('xpack.lens.table.dynamicColoring.customPalette.colorStopsHelpPercentage', {
      defaultMessage: "Percentage values are computed against table's current data.",
    }),
    i18n.translate('xpack.lens.table.dynamicColoring.customPalette.colorStopsHelpInclusive', {
      defaultMessage: 'Stop values are inclusive.',
    }),
  ];
  const colorStopsToShow = getColorStops(
    palettes,
    activePalette?.params?.colorStops || [],
    activePalette,
    dataBounds
  );

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
              const newParams: CustomPaletteParams = {
                ...activePalette.params,
                name: newPalette.name,
                colorStops: undefined,
              };

              if (isNewPaletteCustom) {
                newParams.colorStops = getColorStops(palettes, [], activePalette, dataBounds);
              }

              newParams.stops = getPaletteStops(palettes, newParams, {
                prevPalette:
                  isNewPaletteCustom || isCurrentPaletteCustom ? undefined : newPalette.name,
                dataBounds,
              });

              setPalette({
                ...newPalette,
                params: newParams,
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
          label={i18n.translate('xpack.lens.table.dynamicColoring.rangeType.label', {
            defaultMessage: 'Value type',
          })}
          display="rowCompressed"
        >
          <EuiButtonGroup
            isFullWidth
            legend={i18n.translate('xpack.lens.table.dynamicColoring.rangeType.label', {
              defaultMessage: 'Value type',
            })}
            data-test-subj="lnsDatatable_dynamicColoring_custom_range_groups"
            name="dynamicColoringRangeType"
            buttonSize="compressed"
            options={[
              {
                id: `${idPrefix}percent`,
                label: i18n.translate('xpack.lens.table.dynamicColoring.rangeType.percent', {
                  defaultMessage: 'Percent',
                }),
                'data-test-subj': 'lnsDatatable_dynamicColoring_rangeType_groups_percent',
              },
              {
                id: `${idPrefix}number`,
                label: i18n.translate('xpack.lens.table.dynamicColoring.rangeType.number', {
                  defaultMessage: 'Number',
                }),
                'data-test-subj': 'lnsDatatable_dynamicColoring_rangeType_groups_number',
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

              const params: CustomPaletteParams = { rangeType: newRangeType };
              if (isCurrentPaletteCustom) {
                const { min: newMin, max: newMax } = getDataMinMax(newRangeType, dataBounds);
                const { min: oldMin, max: oldMax } = getDataMinMax(
                  activePalette.params?.rangeType,
                  dataBounds
                );
                const newColorStops = roundStopValues(
                  remapStopsByNewInterval(colorStopsToShow, {
                    oldInterval: oldMax - oldMin,
                    newInterval: newMax - newMin,
                    newMin,
                    oldMin,
                  })
                );
                const stops = getPaletteStops(
                  palettes,
                  { ...activePalette.params, colorStops: newColorStops, ...params },
                  { dataBounds }
                );
                params.colorStops = newColorStops;
                params.stops = stops;
                params.rangeMin = newColorStops[0].stop;
                params.rangeMax = newColorStops[newColorStops.length - 1].stop;
              } else {
                params.stops = getPaletteStops(
                  palettes,
                  { ...activePalette.params, ...params },
                  { prevPalette: activePalette.name, dataBounds }
                );
              }
              setPalette(mergePaletteParams(activePalette, params));
            }}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <EuiToolTip content={stopsTooltipContent.join('\n')}>
              <span>
                {i18n.translate('xpack.lens.table.dynamicColoring.customPalette.colorStopsLabel', {
                  defaultMessage: 'Color stops',
                })}{' '}
                <EuiIcon type="questionInCircle" color="subdued" />
              </span>
            </EuiToolTip>
          }
        >
          <CustomStops
            key={`${activePalette.name}-${rangeType}`}
            colorStops={colorStopsToShow}
            rangeType={rangeType}
            dataBounds={dataBounds}
            onChange={(colorStops) => {
              const newParams = getSwitchToCustomParams(
                palettes,
                activePalette,
                {
                  colorStops,
                  steps: activePalette.params!.steps || DEFAULT_COLOR_STEPS,
                  rangeMin: colorStops[0]?.stop,
                  rangeMax: colorStops[colorStops.length - 1]?.stop,
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
          label={i18n.translate('xpack.lens.table.dynamicColoring.reverse.label', {
            defaultMessage: 'Reverse colors',
          })}
          display="columnCompressedSwitch"
        >
          <EuiSwitch
            data-test-subj="lnsDatatable_dynamicColoring_reverse"
            checked={Boolean(activePalette.params?.reverse ?? defaultParams.reverse)}
            onChange={(newValue) => {
              const params: CustomPaletteParams = { reverse: newValue.target.checked };
              if (isCurrentPaletteCustom) {
                params.colorStops = reversePalette(colorStopsToShow);
                params.stops = getPaletteStops(
                  palettes,
                  {
                    ...(activePalette?.params || {}),
                    colorStops: params.colorStops,
                  },
                  { dataBounds }
                );
              } else {
                params.stops = reversePalette(
                  activePalette?.params?.stops ||
                    getPaletteStops(
                      palettes,
                      { ...activePalette.params, ...params },
                      { prevPalette: activePalette.name, dataBounds }
                    )
                );
              }
              setPalette(mergePaletteParams(activePalette, params));
            }}
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
