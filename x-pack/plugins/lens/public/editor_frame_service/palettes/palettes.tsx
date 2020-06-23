/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { i18n } from '@kbn/i18n';
import color from 'color';
import {
  euiPaletteColorBlindBehindText,
  euiPaletteCool,
  euiPaletteGray,
  colorPalette as buildColorPalette,
} from '@elastic/eui';
import { createColorPalette } from '../../../../../../src/plugins/charts/public';
import { ColorFunctionDefinition, SeriesLayer } from '../../types';

function buildRoundRobinCategorical(colors: string[] | ((n: number) => string[])) {
  return {
    getColor(series: SeriesLayer[]) {
      const actualColors = Array.isArray(colors) ? colors : colors(series[0].totalSeriesAtDepth);
      const outputColor = actualColors[series[0].rankAtDepth % actualColors.length];

      const lighten = (series.length - 1) / (series[0].maxDepth * 2);
      return color(outputColor, 'hsl').lighten(lighten).hex();
    },
    renderPreview(element: Element) {
      const actualColors = Array.isArray(colors) ? colors : colors(10);
      render(
        element,
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
        </div>
      );
    },
  };
}

function buildGradient(gradientColors: [string, string]) {
  return {
    getColor(series: SeriesLayer[]) {
      const colors = buildColorPalette(gradientColors, series[0].totalSeriesAtDepth);
      const outputColor = colors[series[0].rankAtDepth % colors.length];

      // TODO make sure this is not leaking into the next root level hue range
      const lighten = (series.length - 1) / (series[0].maxDepth * 2);
      return color(outputColor, 'hsl').lighten(lighten).hex();
    },
    renderPreview(element: Element) {
      render(
        element,
        <div className="lensPaletteSwatch">
          <div className="lensPaletteSwatch__foreground">
            <div
              key="gradient"
              className="lensPaletteSwatch__box"
              style={{ background: `linear-gradient(90deg, ${gradientColors.join(', ')})` }}
            />
          </div>
        </div>
      );
    },
  };
}

export const palettes: Record<string, ColorFunctionDefinition> = {
  eui: {
    id: 'eui',
    title: i18n.translate('xpack.lens.palettes.euiPaletteLabel', { defaultMessage: 'Color Blind' }),
    ...buildRoundRobinCategorical(euiPaletteColorBlindBehindText()),
  },
  eui_pastel: {
    id: 'eui_pastel',
    title: i18n.translate('xpack.lens.palettes.pastelLabel', { defaultMessage: 'Pastel' }),
    ...buildRoundRobinCategorical(
      (euiPaletteColorBlindBehindText() as string[]).map((original) =>
        color(original).lighten(0.2).hex()
      )
    ),
  },
  kibana_palette: {
    id: 'kibana_palette',
    title: i18n.translate('xpack.lens.palettes.kibanaPaletteLabel', {
      defaultMessage: 'Kibana Default',
    }),
    // TODO use charts.colors.mappedColors.mapKeys and charts.colors.mappedColors.get to align with dashboard colors
    ...buildRoundRobinCategorical(createColorPalette),
  },
  eui_gray: {
    id: 'eui_gray',
    title: i18n.translate('xpack.lens.palettes.grayGradientLabel', { defaultMessage: 'Gray' }),
    ...buildRoundRobinCategorical(euiPaletteGray),
  },
  eui_cool: {
    id: 'eui_cool',
    title: i18n.translate('xpack.lens.palettes.coolBlueGradientLabel', {
      defaultMessage: 'Cool Blue',
    }),
    ...buildRoundRobinCategorical(euiPaletteCool),
  },
  elastic_teal: {
    id: 'elastic_teal',
    title: i18n.translate('xpack.lens.palettes.tealGradientLabel', { defaultMessage: 'Teal' }),
    ...buildGradient(['#C5FAF4', '#0F6259']),
  },
  elastic_blue: {
    id: 'elastic_blue',
    title: i18n.translate('xpack.lens.palettes.blueGradientLabel', { defaultMessage: 'Blue' }),
    ...buildGradient(['#7ECAE3', '#003A4D']),
  },
  elastic_pink: {
    id: 'elastic_pink',
    title: i18n.translate('xpack.lens.palettes.pinkGradientLabel', { defaultMessage: 'Pink' }),
    ...buildGradient(['#FEA8D5', '#531E3A']),
  },
  elastic_purple: {
    id: 'elastic_purple',
    title: i18n.translate('xpack.lens.palettes.purpleGradientLabel', { defaultMessage: 'Purple' }),
    ...buildGradient(['#CCC7DF', '#130351']),
  },
  paul_tor: {
    id: 'paul_tor',
    title: 'Paul Tor',
    ...buildRoundRobinCategorical([
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
};
