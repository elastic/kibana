/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useReducer, useMemo } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import type { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import { EuiFormRow, htmlIdGenerator, EuiButtonGroup, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PalettePicker } from './palette_picker';
import type { DataBounds } from './types';

import './palette_configuration.scss';

import type { CustomPaletteParams, RequiredPaletteParamTypes } from '../../../common';
import { toColorRanges, getFallbackDataBounds } from './utils';
import { ColorRanges, ColorRangesContext } from './color_ranges';
import { isAllColorRangesValid } from './color_ranges/color_ranges_validation';
import { paletteConfigurationReducer } from './palette_configuration_reducer';

export function CustomizablePalette({
  palettes,
  activePalette,
  setPalette,
  dataBounds = getFallbackDataBounds(activePalette.params?.rangeType),
  showRangeTypeSelector = true,
  disableSwitchingContinuity = false,
}: {
  palettes: PaletteRegistry;
  activePalette: PaletteOutput<CustomPaletteParams>;
  setPalette: (palette: PaletteOutput<CustomPaletteParams>) => void;
  dataBounds?: DataBounds;
  showRangeTypeSelector?: boolean;
  disableSwitchingContinuity?: boolean;
}) {
  const idPrefix = useMemo(() => htmlIdGenerator()(), []);
  const colorRangesToShow = toColorRanges(
    palettes,
    activePalette.params?.colorStops || [],
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
        (localState.activePalette !== activePalette ||
          colorRangesToShow !== localState.colorRanges) &&
        isAllColorRangesValid(localState.colorRanges)
      ) {
        setPalette(localState.activePalette);
      }
    },
    250,
    [localState]
  );

  return (
    <div className="lnsPalettePanel__section lnsPalettePanel__section--shaded">
      <EuiFormRow
        display="rowCompressed"
        label={i18n.translate('xpack.lens.palettePicker.label', {
          defaultMessage: 'Color palette',
        })}
        fullWidth
      >
        <PalettePicker
          data-test-subj="lnsPalettePanel_dynamicColoring_palette_picker"
          palettes={palettes}
          activePalette={localState.activePalette}
          setPalette={(newPalette) => {
            const isPaletteChanged = newPalette.name !== activePalette.name;
            if (isPaletteChanged) {
              dispatch({
                type: 'changeColorPalette',
                payload: { palette: newPalette, dataBounds, palettes, disableSwitchingContinuity },
              });
            }
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
            isFullWidth
          />
        </EuiFormRow>
      )}
      <EuiFormRow
        label={i18n.translate('xpack.lens.palettePicker.colorRangesLabel', {
          defaultMessage: 'Color Ranges',
        })}
        display="rowCompressed"
        fullWidth
      >
        <ColorRangesContext.Provider
          value={{
            dataBounds,
            palettes,
            disableSwitchingContinuity,
          }}
        >
          <ColorRanges
            paletteConfiguration={localState.activePalette?.params}
            colorRanges={localState.colorRanges}
            dispatch={dispatch}
          />
        </ColorRangesContext.Provider>
      </EuiFormRow>
    </div>
  );
}
