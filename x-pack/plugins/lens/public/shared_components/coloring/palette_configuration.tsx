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
  htmlIdGenerator,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PalettePicker } from './palette_picker';

import './palette_configuration.scss';

import { CustomStops } from './color_stops';
import { defaultPaletteParams, CUSTOM_PALETTE, DEFAULT_COLOR_STEPS } from './constants';
import { CustomPaletteParams, RequiredPaletteParamTypes } from './types';
import {
  getColorStops,
  getPaletteStops,
  mergePaletteParams,
  getDataMinMax,
  remapStopsByNewInterval,
  getSwitchToCustomParams,
  reversePalette,
  roundStopValues,
} from './utils';
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
  const isCurrentPaletteCustom = activePalette.params?.name === CUSTOM_PALETTE;

  const colorStopsToShow = roundStopValues(
    getColorStops(palettes, activePalette?.params?.colorStops || [], activePalette, dataBounds)
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
          label={
            <>
              {i18n.translate('xpack.lens.table.dynamicColoring.continuity.label', {
                defaultMessage: 'Color continuity',
              })}{' '}
              <EuiIconTip
                content={i18n.translate(
                  'xpack.lens.table.dynamicColoring.customPalette.continuityHelp',
                  {
                    defaultMessage:
                      'Specify how colors appear before the first color stop, and after the last color stop.',
                  }
                )}
                position="top"
                size="s"
              />
            </>
          }
          display="rowCompressed"
        >
          <EuiSuperSelect
            data-test-subj="lnsDatatable_dynamicColoring_continuity"
            compressed
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
            valueOfSelected={activePalette.params?.continuity || defaultPaletteParams.continuity}
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
                const newColorStops = remapStopsByNewInterval(colorStopsToShow, {
                  oldInterval: oldMax - oldMin,
                  newInterval: newMax - newMin,
                  newMin,
                  oldMin,
                });
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
          display="rowCompressed"
          label={i18n.translate('xpack.lens.table.dynamicColoring.customPalette.colorStopsLabel', {
            defaultMessage: 'Color stops',
          })}
          labelAppend={
            <EuiText size="xs">
              <EuiLink
                className="lnsPalettePanel__reverseButton"
                data-test-subj="lnsDatatable_dynamicColoring_reverse"
                onClick={() => {
                  const params: CustomPaletteParams = { reverse: !activePalette.params?.reverse };
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
              >
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon size="s" type="sortable" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    {i18n.translate('xpack.lens.table.dynamicColoring.reverse.label', {
                      defaultMessage: 'Reverse colors',
                    })}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiLink>
            </EuiText>
          }
        >
          <CustomStops
            paletteConfiguration={activePalette?.params}
            data-test-prefix="lnsDatatable"
            colorStops={colorStopsToShow}
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
    </>
  );
}
