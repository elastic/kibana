/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import { EuiFormRow, htmlIdGenerator, EuiButtonGroup, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PalettePicker } from './palette_picker';

import './palette_configuration.scss';

import { CUSTOM_PALETTE, DEFAULT_COLOR_STEPS } from './constants';
import type { CustomPaletteParams, RequiredPaletteParamTypes } from '../../../common';
import {
  getColorStops,
  getPaletteStops,
  mergePaletteParams,
  getDataMinMax,
  getStopsFromColorRangesByNewInterval,
  getSwitchToCustomParams,
  roundStopValues,
  roundValue,
  getAutoValues,
} from './utils';

import { ColorRanges } from './color_ranges';
const idPrefix = htmlIdGenerator()();

/**
 * Some name conventions here:
 * * `stops` => final steps used to table coloring. It is a rightShift of the colorStops
 * * `colorStops` => used for correct work other part of application based on `stops`.  Used to compute range min.
 * * `colorRanges` => user's color ranges inputs.  Used to compute colorStops. The main diff here we have completely range for each color.
 *
 * Both table coloring logic and EuiPaletteDisplay format implementation works differently than our current `colorStops`,
 * by having the stop values at the end of each color segment rather than at the beginning: `stops` values are computed by a rightShift of `colorStops`.
 * EuiPaletteDisplay has an additional requirement as it is always mapped against a domain [0, N]: from `stops` the `displayStops` are computed with
 * some continuity enrichment and a remap against a [0, 100] domain to make the palette component work ok.
 *
 * These naming conventions would be useful to track the code flow in this feature as multiple transformations are happening
 * for a single change.
 */

function getColorRanges(
  palettes: PaletteRegistry,
  colorStops: CustomPaletteParams['colorStops'],
  activePalette: PaletteOutput<CustomPaletteParams>,
  dataBounds: { min: number; max: number }
) {
  const colorStopsToShow = roundStopValues(
    getColorStops(palettes, colorStops || [], activePalette, dataBounds)
  );
  const rangeType = activePalette.params?.rangeType ?? 'percent';

  const continuity = activePalette.params?.continuity;
  let max = activePalette.params?.rangeMax || dataBounds.max;
  let min = activePalette.params?.rangeMin || dataBounds.min;

  if (continuity) {
    const { max: autoMax, min: autoMin } = getAutoValues(
      {
        first: colorStopsToShow[1].stop,
        preLast: colorStopsToShow[colorStopsToShow.length - 2].stop,
        last: colorStopsToShow[colorStopsToShow.length - 1].stop,
      },
      rangeType,
      dataBounds
    );
    if (['above', 'all'].includes(continuity)) {
      max = autoMax;
    }

    // as 0-stop is -infinity when auto detected min value
    if (['below', 'all'].includes(continuity)) {
      min = autoMin;
    }
  }

  if (rangeType === 'percent') {
    const oldMin = min;
    const interval = max - min;
    min = ((min - oldMin) * 100) / interval;
    max = ((max - oldMin) * 100) / interval;
  }

  return colorStopsToShow.map((colorStop, index) => {
    return {
      color: colorStop.color,
      start:
        index === 0 && continuity && ['below', 'all'].includes(continuity)
          ? roundValue(min)
          : colorStop.stop ?? activePalette.params?.rangeMin,
      end: index < colorStopsToShow.length - 1 ? colorStopsToShow[index + 1].stop : roundValue(max),
    };
  });
}

export function CustomizablePalette({
  palettes,
  activePalette,
  setPalette,
  dataBounds,
  showRangeTypeSelector = true,
}: {
  palettes: PaletteRegistry;
  activePalette?: PaletteOutput<CustomPaletteParams>;
  setPalette: (palette: PaletteOutput<CustomPaletteParams>) => void;
  dataBounds?: { min: number; max: number };
  showRangeTypeSelector?: boolean;
}) {
  if (!dataBounds || !activePalette) {
    return null;
  }
  const isCurrentPaletteCustom = activePalette.params?.name === CUSTOM_PALETTE;

  const colorRangesToShow = getColorRanges(
    palettes,
    activePalette?.params?.colorStops || [],
    activePalette,
    dataBounds
  );

  return (
    <div className="lnsPalettePanel__section lnsPalettePanel__section--shaded">
      <EuiFormRow
        display="rowCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.palettePicker.label', {
          defaultMessage: 'Color palette',
        })}
      >
        <PalettePicker
          data-test-subj="lnsPalettePanel_dynamicColoring_palette_picker"
          palettes={palettes}
          activePalette={activePalette}
          setPalette={(newPalette) => {
            const isNewPaletteCustom = newPalette.name === CUSTOM_PALETTE;
            const newParams: CustomPaletteParams = {
              ...activePalette.params,
              name: newPalette.name,
              colorStops: undefined,
              reverse: false, // restore the reverse flag
            };

            const newColorStops = getColorStops(palettes, [], activePalette, dataBounds);
            if (isNewPaletteCustom) {
              newParams.colorStops = newColorStops;
            }

            newParams.stops = getPaletteStops(palettes, newParams, {
              prevPalette:
                isNewPaletteCustom || isCurrentPaletteCustom ? undefined : newPalette.name,
              dataBounds,
              mapFromMinValue: true,
            });

            const rangeType = activePalette.params?.rangeType ?? 'percent';
            const max = rangeType === 'percent' ? 100 : dataBounds.max;
            const min = rangeType === 'percent' ? 100 : dataBounds.min;
            newParams.rangeMin = newColorStops[0].stop > min ? min : newColorStops[0].stop;
            newParams.rangeMax =
              newColorStops[newColorStops.length - 1].stop < max
                ? max
                : newColorStops[newColorStops.length - 1].stop;

            setPalette({
              ...newPalette,
              params: newParams,
            });
          }}
          showCustomPalette
          showDynamicColorOnly
        />
      </EuiFormRow>
      {showRangeTypeSelector && (
        <EuiFormRow
          label={
            <>
              {i18n.translate('xpack.lens.table.dynamicColoring.rangeType.label', {
                defaultMessage: 'Value type',
              })}{' '}
              <EuiIconTip
                content={i18n.translate(
                  'xpack.lens.table.dynamicColoring.customPalette.colorStopsHelpPercentage',
                  {
                    defaultMessage:
                      'Percent value types are relative to the full range of available data values.',
                  }
                )}
                position="top"
                size="s"
              />
            </>
          }
          display="rowCompressed"
        >
          <EuiButtonGroup
            isFullWidth
            legend={i18n.translate('xpack.lens.table.dynamicColoring.rangeType.label', {
              defaultMessage: 'Value type',
            })}
            data-test-subj="lnsPalettePanel_dynamicColoring_custom_range_groups"
            name="dynamicColoringRangeType"
            buttonSize="compressed"
            options={[
              {
                id: `${idPrefix}percent`,
                label: i18n.translate('xpack.lens.table.dynamicColoring.rangeType.percent', {
                  defaultMessage: 'Percent',
                }),
                'data-test-subj': 'lnsPalettePanel_dynamicColoring_rangeType_groups_percent',
              },
              {
                id: `${idPrefix}number`,
                label: i18n.translate('xpack.lens.table.dynamicColoring.rangeType.number', {
                  defaultMessage: 'Number',
                }),
                'data-test-subj': 'lnsPalettePanel_dynamicColoring_rangeType_groups_number',
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

              const continuity = activePalette.params?.continuity;
              const params: CustomPaletteParams = { rangeType: newRangeType };
              const { min: newMin, max: newMax } = getDataMinMax(newRangeType, dataBounds);
              const { min: oldMin, max: oldMax } = getDataMinMax(
                activePalette.params?.rangeType,
                dataBounds
              );
              const newColorStops = getStopsFromColorRangesByNewInterval(colorRangesToShow, {
                oldInterval: oldMax - oldMin,
                newInterval: newMax - newMin,
                newMin,
                oldMin,
              });
              if (isCurrentPaletteCustom) {
                const stops = getPaletteStops(
                  palettes,
                  { ...activePalette.params, colorStops: newColorStops, ...params },
                  { dataBounds }
                );
                params.colorStops = newColorStops;
                params.stops = stops;
              } else {
                params.stops = getPaletteStops(
                  palettes,
                  { ...activePalette.params, ...params },
                  { prevPalette: activePalette.name, dataBounds }
                );
              }

              params.rangeMin = newColorStops[0].stop;
              params.rangeMax = newMax;
              if (continuity) {
                if (['above', 'all'].includes(continuity)) {
                  params.rangeMax = Infinity;
                }

                if (['below', 'all'].includes(continuity)) {
                  params.rangeMin = -Infinity;
                }
              }
              setPalette(mergePaletteParams(activePalette, params));
            }}
          />
        </EuiFormRow>
      )}
      <ColorRanges
        paletteConfiguration={activePalette?.params}
        colorRanges={colorRangesToShow}
        dataBounds={dataBounds}
        data-test-prefix="lnsPalettePanel"
        onChange={(colorStops, upperMax, continuity) => {
          const newParams = getSwitchToCustomParams(
            palettes,
            activePalette,
            {
              continuity,
              colorStops,
              steps: activePalette.params?.steps || DEFAULT_COLOR_STEPS,
              reverse: !activePalette.params?.reverse,
              rangeMin: colorStops[0]?.stop,
              rangeMax: upperMax,
            },
            dataBounds
          );
          return setPalette(newParams);
        }}
      />
    </div>
  );
}
