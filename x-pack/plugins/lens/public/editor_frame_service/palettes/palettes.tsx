/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { Ast } from '@kbn/interpreter/common';
import color from 'color';
import {
  euiPaletteColorBlindBehindText,
  euiPaletteCool,
  euiPaletteGray,
  colorPalette as buildColorPalette,
} from '@elastic/eui';
import { ChartsPluginSetup, createColorPalette } from '../../../../../../src/plugins/charts/public';
import { ColorFunctionDefinition, SeriesLayer } from '../../types';
import { PaletteSetupPlugins } from './service';
import { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common/expression_functions';

function buildRoundRobinCategorical(id: string, colors: string[] | ((n: number) => string[])) {
  function getColor(series: SeriesLayer[]) {
    const actualColors = Array.isArray(colors) ? colors : colors(series[0].totalSeriesAtDepth);
    const outputColor = actualColors[series[0].rankAtDepth % actualColors.length];

    const lighten = (series.length - 1) / (series[0].maxDepth * 2);
    return color(outputColor, 'hsl').lighten(lighten).hex();
  }
  return {
    id,
    getColor,
    ...buildStatelessExpressionIntegration(id, getColor),
    renderPreview(element: Element) {
      const actualColors = Array.isArray(colors) ? colors : colors(10);
      render(
        <div className="lensPaletteSwatch">
          <div className="lensPaletteSwatch__foreground">
            {actualColors.map((currentColor) => (
              <div
                key={currentColor}
                className="lensPaletteSwatch__box"
                style={{ backgroundColor: currentColor }}
              />
            ))}
          </div>
        </div>,
        element
      );
    },
  };
}

function buildGradient(id: string, gradientColors: [string, string]) {
  function getColor(series: SeriesLayer[]) {
    const colors = buildColorPalette(gradientColors, series[0].totalSeriesAtDepth);
    const outputColor = colors[series[0].rankAtDepth % colors.length];

    // TODO make sure this is not leaking into the next root level hue range
    const lighten = (series.length - 1) / (series[0].maxDepth * 2);
    return color(outputColor, 'hsl').lighten(lighten).hex();
  }
  return {
    id,
    getColor,
    ...buildStatelessExpressionIntegration(id, getColor),
    renderPreview(element: Element) {
      render(
        <div className="lensPaletteSwatch">
          <div className="lensPaletteSwatch__foreground">
            <div
              key="gradient"
              className="lensPaletteSwatch__box"
              style={{ background: `linear-gradient(90deg, ${gradientColors.join(', ')})` }}
            />
          </div>
        </div>,
        element
      );
    },
  };
}

function buildSyncedKibanaPalette(colors: ChartsPluginSetup['colors']) {
  function getColor(series: SeriesLayer[]) {
    colors.mappedColors.mapKeys([series[0].name]);
    const outputColor = colors.mappedColors.get(series[0].name);

    const lighten = (series.length - 1) / (series[0].maxDepth * 2);
    return color(outputColor, 'hsl').lighten(lighten).hex();
  }
  return {
    id: 'kibana_palette',
    getColor,
    ...buildStatelessExpressionIntegration('kibana_palette', getColor),
    renderPreview(element: Element) {
      const actualColors = createColorPalette(10);
      render(
        <div className="lensPaletteSwatch">
          <div className="lensPaletteSwatch__foreground">
            {actualColors.map((currentColor) => (
              <div
                key={currentColor}
                className="lensPaletteSwatch__box"
                style={{ backgroundColor: currentColor }}
              />
            ))}
          </div>
        </div>,
        element
      );
    },
  };
}

export interface LensPalette {
  getColor: ColorFunctionDefinition['getColor'];
}

function buildStatelessExpressionIntegration(
  id: string,
  getColor: ColorFunctionDefinition['getColor']
): {
  toExpression: () => Ast;
  expressionFunctionDefinition: ExpressionFunctionDefinition<
    string,
    null,
    {},
    LensPalette & { type: 'lens_palette' }
  >;
} {
  return {
    toExpression: () => ({
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: `lens_palette_${id}`,
          arguments: {},
        },
      ],
    }),
    expressionFunctionDefinition: {
      name: `lens_palette_${id}`,
      type: 'lens_palette',
      help: i18n.translate('xpack.lens.functions.palette.help', {
        defaultMessage: 'Create a color palette to be used in a lens visualization',
      }),
      args: {},
      inputTypes: ['null'],
      fn() {
        return {
          type: 'lens_palette',
          getColor,
        };
      },
    },
  };
}

// These definitions will be rolled up into the implementation of the lens_palette expression function definition in the service
type SerializableColorFunctionDefinition = ColorFunctionDefinition & {
  expressionFunctionDefinition: ExpressionFunctionDefinition<string, unknown, unknown, unknown>;
};

export const buildPalettes: (
  dependencies: PaletteSetupPlugins
) => Record<string, SerializableColorFunctionDefinition> = ({ charts }) => ({
  eui: {
    title: i18n.translate('xpack.lens.palettes.euiPaletteLabel', { defaultMessage: 'Color Blind' }),
    ...buildRoundRobinCategorical('eui', euiPaletteColorBlindBehindText()),
  },
  eui_pastel: {
    title: i18n.translate('xpack.lens.palettes.pastelLabel', { defaultMessage: 'Pastel' }),
    ...buildRoundRobinCategorical(
      'eui_pastel',
      (euiPaletteColorBlindBehindText() as string[]).map((original) =>
        color(original).lighten(0.2).hex()
      )
    ),
  },
  kibana_palette: {
    title: i18n.translate('xpack.lens.palettes.kibanaPaletteLabel', {
      defaultMessage: 'Kibana Default',
    }),
    ...buildSyncedKibanaPalette(charts.colors),
  },
  eui_gray: {
    title: i18n.translate('xpack.lens.palettes.grayGradientLabel', { defaultMessage: 'Gray' }),
    ...buildRoundRobinCategorical('eui_gray', euiPaletteGray),
  },
  eui_cool: {
    title: i18n.translate('xpack.lens.palettes.coolBlueGradientLabel', {
      defaultMessage: 'Cool Blue',
    }),
    ...buildRoundRobinCategorical('eui_cool', euiPaletteCool),
  },
  elastic_teal: {
    title: i18n.translate('xpack.lens.palettes.tealGradientLabel', { defaultMessage: 'Teal' }),
    ...buildGradient('elastic_teal', ['#C5FAF4', '#0F6259']),
  },
  elastic_blue: {
    title: i18n.translate('xpack.lens.palettes.blueGradientLabel', { defaultMessage: 'Blue' }),
    ...buildGradient('elastic_blue', ['#7ECAE3', '#003A4D']),
  },
  elastic_pink: {
    title: i18n.translate('xpack.lens.palettes.pinkGradientLabel', { defaultMessage: 'Pink' }),
    ...buildGradient('elastic_pink', ['#FEA8D5', '#531E3A']),
  },
  elastic_purple: {
    title: i18n.translate('xpack.lens.palettes.purpleGradientLabel', { defaultMessage: 'Purple' }),
    ...buildGradient('elastic_purple', ['#CCC7DF', '#130351']),
  },
  paul_tor: {
    title: 'Paul Tor',
    ...buildRoundRobinCategorical('paul_tor', [
      '#882E72',
      '#B178A6',
      '#D6C1DE',
      '#1965B0',
      '#5289C7',
      '#7BAFDE',
      '#4EB265',
      '#90C987',
      '#CAE0AB',
      '#F7EE55',
      '#F6C141',
      '#F1932D',
      '#E8601C',
      '#DC050C',
    ]),
  },
});
