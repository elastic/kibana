/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useReducer } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import type { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import { EuiFormRow, htmlIdGenerator, EuiButtonGroup, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PalettePicker } from './palette_picker';

import './palette_configuration.scss';

import { CUSTOM_PALETTE, DEFAULT_COLOR_STEPS, DEFAULT_CONTINUITY } from './constants';
import type { CustomPaletteParams, RequiredPaletteParamTypes } from '../../../common';
import { getSwitchToCustomParams, toColorRanges } from './utils';

import { toColorStops } from './color_ranges/utils';

import { ColorRanges } from './color_ranges';

import { paletteConfigurationReducer } from './palette_configuration_reducer';
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
  if (!dataBounds || !activePalette) {
    return null;
  }

  const colorRangesToShow = toColorRanges(
    palettes,
    activePalette?.params?.colorStops || [],
    activePalette,
    dataBounds
  );

  const [localState, dispatch] = useReducer(paletteConfigurationReducer, {
    activePalette,
    colorRanges: colorRangesToShow,
  });

  useDebounce(
    () => {
      if (
        localState.activePalette !== activePalette ||
        colorRangesToShow !== localState.colorRanges
      ) {
        let newPalette = localState.activePalette;

        const continuity = localState.activePalette.params?.continuity ?? DEFAULT_CONTINUITY;
        const isCurrentPaletteCustom = localState.activePalette.name === CUSTOM_PALETTE;
        const { max, colorStops } = toColorStops(localState.colorRanges, continuity);

        if (isCurrentPaletteCustom && newPalette.params?.colorStops !== colorStops) {
          newPalette = getSwitchToCustomParams(
            palettes,
            localState.activePalette!,
            {
              continuity,
              colorStops,
              steps: localState.activePalette!.params?.steps || DEFAULT_COLOR_STEPS,
              reverse: !localState.activePalette!.params?.reverse,
              rangeMin: colorStops[0]?.stop,
              rangeMax: max,
            },
            dataBounds!
          );
        }

        setPalette(newPalette);
      }
    },
    250,
    [localState]
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
          activePalette={localState.activePalette}
          setPalette={(newPalette) => {
            dispatch({
              type: 'changeColorPalette',
              payload: { palette: newPalette, dataBounds, palettes },
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
              localState.activePalette.params?.rangeType
                ? `${idPrefix}${localState.activePalette.params?.rangeType}`
                : `${idPrefix}percent`
            }
            onChange={(id) => {
              const newRangeType = id.replace(
                idPrefix,
                ''
              ) as RequiredPaletteParamTypes['rangeType'];

              dispatch({
                type: 'updateRangeType',
                payload: { rangeType: newRangeType, dataBounds, palettes },
              });
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
          paletteConfiguration={localState.activePalette?.params}
          colorRanges={localState.colorRanges}
          dataBounds={dataBounds}
          dispatch={dispatch}
        />
      </EuiFormRow>
    </div>
  );
}
