/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// There is still an issue with Vega Lite's typings with the strict mode Kibana is using.
// @ts-ignore
import type { TopLevelSpec } from 'vega-lite/build/vega-lite';

import { euiLightVars as euiThemeLight } from '@kbn/ui-theme';

import { euiPaletteColorBlind, euiPaletteNegative, euiPalettePositive } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { LegendType, LEGEND_TYPES } from '../vega_chart/common';

export const OUTLIER_SCORE_FIELD = 'outlier_score';

const SCATTERPLOT_SIZE = 125;
export const USER_SELECTION = 'user_selection';
export const SINGLE_POINT_CLICK = 'single_point_click';

export const COLOR_BLUR = '#bbb';
export const COLOR_OUTLIER = euiPaletteNegative(2)[1];
export const COLOR_SELECTION = euiPaletteColorBlind()[2];
export const COLOR_RANGE_OUTLIER = [euiPaletteColorBlind()[1], euiPaletteColorBlind()[2]];
export const COLOR_RANGE_NOMINAL = euiPaletteColorBlind({ rotations: 2 });
export const COLOR_RANGE_QUANTITATIVE = euiPalettePositive(5);
const CUSTOM_VIS_FIELDS_PATH = 'fields';

export const getColorSpec = (
  forCustomVisLink: boolean,
  euiTheme: typeof euiThemeLight,
  escapedOutlierScoreField?: string,
  color?: string,
  legendType?: LegendType
) => {
  // For outlier detection result pages coloring is done based on a threshold.
  // This returns a Vega spec using a conditional to return the color.
  if (typeof escapedOutlierScoreField === 'string') {
    return {
      condition: {
        selection: USER_SELECTION,
        field: getEscapedVegaFieldName('is_outlier' ?? '00FF00'),
        type: LEGEND_TYPES.NOMINAL,
        scale: {
          range: COLOR_RANGE_OUTLIER,
        },
      },
      value: COLOR_BLUR,
    };
  }

  // Based on the type of the color field,
  // this returns either a continuous or categorical color spec.
  if (color !== undefined && legendType !== undefined) {
    return {
      condition: {
        selection: USER_SELECTION,
        field: `${forCustomVisLink ? `${CUSTOM_VIS_FIELDS_PATH}.` : ''}${getEscapedVegaFieldName(
          color ?? '00FF00'
        )}`,
        type: legendType,
        scale: {
          range:
            legendType === LEGEND_TYPES.NOMINAL ? COLOR_RANGE_NOMINAL : COLOR_RANGE_QUANTITATIVE,
        },
      },
      value: COLOR_BLUR,
    };
  }

  return {
    condition: [{ selection: USER_SELECTION }, { selection: SINGLE_POINT_CLICK }],
    value: COLOR_BLUR,
  };
};

const getVegaSpecLayer = (
  forCustomVisLink: boolean,
  isBackground: boolean,
  values: VegaValue[],
  colorSpec: any,
  escapedOutlierScoreField: string,
  outliers: boolean,
  dynamicSize: boolean,
  vegaColumns: string[],
  color?: string
) => {
  const selection = outliers
    ? {
        selection: {
          [USER_SELECTION]: { type: 'interval' },
          [SINGLE_POINT_CLICK]: { type: 'single' },
          mlOutlierScoreThreshold: {
            type: 'single',
            fields: ['cutoff'],
            bind: {
              input: 'range',
              max: 1,
              min: 0,
              name: i18n.translate('xpack.ml.splomSpec.outlierScoreThresholdName', {
                defaultMessage: 'Outlier score threshold: ',
              }),
              step: 0.01,
            },
            init: { cutoff: 0.99 },
          },
        },
      }
    : {
        selection: {
          // Always allow user selection
          [USER_SELECTION]: {
            type: 'interval',
          },
          [SINGLE_POINT_CLICK]: { type: 'single', empty: 'none' },
        },
      };

  return {
    // Don't need to add static data for custom vis links
    ...(forCustomVisLink ? {} : { data: { values: [...values] } }),
    mark: {
      ...(outliers && dynamicSize
        ? {
            type: 'circle',
            strokeWidth: 1.2,
            strokeOpacity: 0.75,
            fillOpacity: 0.1,
          }
        : { type: 'circle', opacity: 0.75, size: 8 }),
    },
    // transformation to apply outlier threshold as category
    ...(outliers
      ? {
          transform: [
            {
              calculate: `datum${
                forCustomVisLink ? `.${CUSTOM_VIS_FIELDS_PATH}` : ''
              }['${escapedOutlierScoreField}'] >= mlOutlierScoreThreshold.cutoff`,
              as: 'is_outlier',
            },
          ],
        }
      : {}),
    encoding: {
      color: isBackground ? { value: COLOR_BLUR } : colorSpec,
      opacity: {
        condition: {
          selection: USER_SELECTION,
          value: 0.8,
        },
        value: 0.5,
      },
      ...(dynamicSize
        ? {
            stroke: colorSpec,
            opacity: {
              condition: {
                value: 1,
                test: `(datum${
                  forCustomVisLink ? `.${CUSTOM_VIS_FIELDS_PATH}` : ''
                }['${escapedOutlierScoreField}'] >= mlOutlierScoreThreshold.cutoff)`,
              },
              value: 0.5,
            },
          }
        : {}),
      ...(outliers
        ? {
            order: {
              field: `${
                forCustomVisLink ? `${CUSTOM_VIS_FIELDS_PATH}.` : ''
              }${escapedOutlierScoreField}`,
            },
            size: {
              ...(!dynamicSize
                ? {
                    condition: {
                      value: 40,
                      test: `(datum${
                        forCustomVisLink ? `.${CUSTOM_VIS_FIELDS_PATH}` : ''
                      }['${escapedOutlierScoreField}'] >= mlOutlierScoreThreshold.cutoff)`,
                    },
                    value: 8,
                  }
                : {
                    type: LEGEND_TYPES.QUANTITATIVE,
                    field: `${
                      forCustomVisLink ? `${CUSTOM_VIS_FIELDS_PATH}.` : ''
                    }${escapedOutlierScoreField}`,
                    scale: {
                      type: 'linear',
                      range: [8, 200],
                      domain: [0, 1],
                    },
                  }),
            },
          }
        : {}),
      x: {
        type: LEGEND_TYPES.QUANTITATIVE,
        field: { repeat: 'column' },
        scale: { zero: false },
      },
      y: {
        type: LEGEND_TYPES.QUANTITATIVE,
        field: { repeat: 'row' },
        scale: { zero: false },
      },
      tooltip: [
        ...(color !== undefined
          ? // @ts-ignore
            [
              {
                type: colorSpec.condition.type,
                field: `${
                  forCustomVisLink ? `${CUSTOM_VIS_FIELDS_PATH}.` : ''
                }${getEscapedVegaFieldName(color)}`,
              },
            ]
          : []),
        ...vegaColumns.map((d) => ({
          type: LEGEND_TYPES.QUANTITATIVE,
          field: d,
        })),
        ...(outliers
          ? [
              {
                type: LEGEND_TYPES.QUANTITATIVE,
                field: `${
                  forCustomVisLink ? `${CUSTOM_VIS_FIELDS_PATH}.` : ''
                }${escapedOutlierScoreField}`,
                format: '.3f',
              },
            ]
          : []),
      ],
    },
    ...(isBackground ? {} : selection),
    ...(forCustomVisLink ? {} : { width: SCATTERPLOT_SIZE }),
    ...(forCustomVisLink ? {} : { height: SCATTERPLOT_SIZE }),
  };
};

// Escapes the characters .[] in field names with double backslashes
// since VEGA treats dots/brackets in field names as nested values.
// See https://vega.github.io/vega-lite/docs/field.html for details.
function getEscapedVegaFieldName(fieldName: string, prependString: string = '') {
  return `${prependString}${fieldName.replace(/([\.|\[|\]])/g, '\\$1')}`;
}

type VegaValue = Record<string, string | number>;

export const getScatterplotMatrixVegaLiteSpec = (
  forCustomVisLink: boolean,
  values: VegaValue[],
  backgroundValues: VegaValue[],
  columns: string[],
  euiTheme: typeof euiThemeLight,
  resultsField?: string,
  color?: string,
  legendType?: LegendType,
  dynamicSize?: boolean
): TopLevelSpec => {
  const vegaValues = values;
  const vegaColumns = columns.map((column) =>
    getEscapedVegaFieldName(column, forCustomVisLink ? 'fields.' : '')
  );
  const outliers = resultsField !== undefined;

  const escapedOutlierScoreField = `${resultsField}\\.${OUTLIER_SCORE_FIELD}`;

  const colorSpec = getColorSpec(
    forCustomVisLink,
    euiTheme,
    resultsField && escapedOutlierScoreField,
    color,
    legendType
  );

  const schema: TopLevelSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v4.17.0.json',
    background: 'transparent',
    // There seems to be a bug in Vega which doesn't propagate these settings
    // for repeated charts, it seems to be fixed for facets but not repeat.
    // This causes #ddd lines to stand out in dark mode.
    // See: https://github.com/vega/vega-lite/issues/5908
    view: { fill: 'transparent', stroke: euiTheme.euiColorLightestShade },
    padding: 10,
    config: {
      axis: {
        domainColor: euiTheme.euiColorLightShade,
        gridColor: euiTheme.euiColorLightestShade,
        tickColor: euiTheme.euiColorLightestShade,
        labelColor: euiTheme.euiTextSubduedColor,
        titleColor: euiTheme.euiTextSubduedColor,
      },
      legend: {
        orient: 'right',
        labelColor: euiTheme.euiTextSubduedColor,
        titleColor: euiTheme.euiTextSubduedColor,
      },
    },
    repeat: {
      column: vegaColumns,
      row: vegaColumns.slice().reverse(),
    },
    spec: {
      layer: [
        getVegaSpecLayer(
          forCustomVisLink,
          false,
          vegaValues,
          colorSpec,
          escapedOutlierScoreField,
          outliers,
          !!dynamicSize,
          vegaColumns,
          color
        ),
      ],
    },
  };

  if (backgroundValues.length) {
    schema.spec.layer.unshift(
      getVegaSpecLayer(
        forCustomVisLink,
        true,
        backgroundValues,
        colorSpec,
        escapedOutlierScoreField,
        outliers,
        !!dynamicSize,
        vegaColumns,
        color
      )
    );
  }

  return schema;
};
