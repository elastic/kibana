/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import { EuiFormRow, htmlIdGenerator, EuiButtonGroup, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PalettePicker } from './palette_picker';

import './palette_configuration.scss';

import { CUSTOM_PALETTE, DEFAULT_COLOR_STEPS, DEFAULT_CONTINUITY } from './constants';
import type { CustomPaletteParams, RequiredPaletteParamTypes } from '../../../common';
import {
  getColorStops,
  getPaletteStops,
  mergePaletteParams,
  getDataMinMax,
  getStopsFromColorRangesByNewInterval,
  getSwitchToCustomParams,
  toColorRanges,
} from './utils';

import { ColorRanges } from './color_ranges';
const idPrefix = htmlIdGenerator()();

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
  const onChangeColorRanges = useCallback(
    (colorStops, upperMax, continuity) => {
      const newParams = getSwitchToCustomParams(
        palettes,
        activePalette!,
        {
          continuity,
          colorStops,
          steps: activePalette!.params?.steps || DEFAULT_COLOR_STEPS,
          reverse: !activePalette!.params?.reverse,
          rangeMin: colorStops[0]?.stop,
          rangeMax: upperMax,
        },
        dataBounds!
      );
      return setPalette(newParams);
    },
    [activePalette, dataBounds, palettes, setPalette]
  );

  if (!dataBounds || !activePalette) {
    return null;
  }
  const isCurrentPaletteCustom = activePalette.params?.name === CUSTOM_PALETTE;

  const colorRangesToShow = toColorRanges(
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
              continuity: DEFAULT_CONTINUITY,
              reverse: false, // restore the reverse flag
            };

            const newColorStops = getColorStops(palettes, [], activePalette, dataBounds);

            if (isNewPaletteCustom) {
              newParams.colorStops = newColorStops;
            }

            setPalette({
              ...newPalette,
              params: {
                ...newParams,
                stops: getPaletteStops(palettes, newParams, {
                  prevPalette:
                    isNewPaletteCustom || isCurrentPaletteCustom ? undefined : newPalette.name,
                  dataBounds,
                  mapFromMinValue: true,
                }),
                rangeMin: ['below', 'all'].includes(newParams.continuity!)
                  ? -Infinity
                  : Math.min(dataBounds.min, newColorStops[0].stop),
                rangeMax: ['above', 'all'].includes(newParams.continuity!)
                  ? +Infinity
                  : Math.min(dataBounds.max, newColorStops[newColorStops.length - 1].stop),
              },
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
      <EuiFormRow
        label={i18n.translate('xpack.lens.palettePicker.colorRangesLabel', {
          defaultMessage: 'Color Ranges',
        })}
        fullWidth
        display="rowCompressed"
      >
        <ColorRanges
          paletteConfiguration={activePalette?.params}
          colorRanges={colorRangesToShow}
          dataBounds={dataBounds}
          onChange={onChangeColorRanges}
        />
      </EuiFormRow>
    </div>
  );
}
