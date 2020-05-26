/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import color from 'color';
import { schemePastel2, interpolateViridis } from 'd3-scale-chromatic';
import { i18n } from '@kbn/i18n';
import {
  // @ts-ignore
  euiPaletteColorBlindBehindText,
  // @ts-ignore
  euiPaletteGray,
  // @ts-ignore
  euiPaletteCool,
} from '@elastic/eui/lib/services';
import { createColorPalette } from '../../../../../src/plugins/charts/public/services/colors';

interface CategoricalPalette {
  name: string;
  buildCategorical: (size: number) => string[];
}

interface GradientPalette {
  name: string;
  gradientColors: string[];
}

export type PaletteDefinition = CategoricalPalette | GradientPalette;

export const palettes: Record<string, PaletteDefinition> = {
  eui: {
    name: i18n.translate('xpack.lens.palettes.euiPaletteLabel', { defaultMessage: 'Color Blind' }),
    buildCategorical: () => euiPaletteColorBlindBehindText(),
  },
  eui_pastel: {
    name: i18n.translate('xpack.lens.palettes.pastelLabel', { defaultMessage: 'Pastel' }),
    // Colorblind EUI palette is too vibrant
    buildCategorical: () =>
      (euiPaletteColorBlindBehindText() as string[]).map(original =>
        color(original)
          .lighten(0.2)
          .hex()
      ),
  },
  kibana_palette: {
    name: i18n.translate('xpack.lens.palettes.kibanaPaletteLabel', {
      defaultMessage: 'Kibana Default',
    }),
    buildCategorical: n => createColorPalette(n),
  },
  eui_gray: {
    name: i18n.translate('xpack.lens.palettes.grayGradientLabel', { defaultMessage: 'Gray' }),
    buildCategorical: n => euiPaletteGray(n),
  },
  eui_cool: {
    name: i18n.translate('xpack.lens.palettes.coolBlueGradientLabel', {
      defaultMessage: 'Cool Blue',
    }),
    buildCategorical: n => euiPaletteCool(n),
  },
  elastic_teal: {
    name: i18n.translate('xpack.lens.palettes.tealGradientLabel', { defaultMessage: 'Teal' }),
    gradientColors: ['#C5FAF4', '#0F6259'],
  },
  elastic_blue: {
    name: i18n.translate('xpack.lens.palettes.blueGradientLabel', { defaultMessage: 'Blue' }),
    gradientColors: ['#7ECAE3', '#003A4D'],
  },
  elastic_pink: {
    name: i18n.translate('xpack.lens.palettes.pinkGradientLabel', { defaultMessage: 'Pink' }),
    gradientColors: ['#FEA8D5', '#531E3A'],
  },
  elastic_purple: {
    name: i18n.translate('xpack.lens.palettes.purpleGradientLabel', { defaultMessage: 'Purple' }),
    gradientColors: ['#CCC7DF', '#130351'],
  },
  pastel2: {
    name: i18n.translate('xpack.lens.palettes.pastel2Label', { defaultMessage: 'Pastel 2' }),
    buildCategorical: () => [...schemePastel2],
  },
  viridis_categorical: {
    name: 'Viridis', // Name should not be translated
    buildCategorical: n => {
      return [...Array(n)].map((_, i) => interpolateViridis(i / n));
    },
  },
  paul_tor: {
    name: 'Paul Tor',
    buildCategorical: () => [
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
    ],
  },
};
