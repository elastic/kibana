/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Ast } from '@kbn/interpreter/common';
import {
  euiPaletteColorBlind,
  euiPaletteComplimentary,
  euiPaletteCool,
  euiPaletteForStatus,
  euiPaletteGray,
  euiPaletteNegative,
  euiPalettePositive,
  euiPaletteWarm,
} from '@elastic/eui';
import { ChartsPluginSetup } from '../../../../../../src/plugins/charts/public';
import { ColorFunctionDefinition, SeriesLayer } from '../../types';
import { PaletteSetupPlugins } from './service';
import { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common/expression_functions';
import { lightenColor } from './lighten_color';

function buildRoundRobinCategoricalWithMappedColors(
  colorService: ChartsPluginSetup['colors'],
  id: string,
  colors: (n: number) => string[]
) {
  function getColor(series: SeriesLayer[]) {
    const colorFromSettings = colorService.mappedColors.getConfigMapping(series[0].name);
    const actualColors = colors(series[0].totalSeriesAtDepth);
    const outputColor =
      colorFromSettings || actualColors[series[0].rankAtDepth % actualColors.length];

    if (series[0].maxDepth === 1) {
      return outputColor;
    }

    return lightenColor(outputColor, series.length, series[0].maxDepth);
  }
  return {
    id,
    getColor,
    ...buildStatelessExpressionIntegration(id, getColor),
    getPreviewPalette: () => colors(10),
  };
}

function buildSyncedKibanaPalette(colors: ChartsPluginSetup['colors']) {
  function getColor(series: SeriesLayer[]) {
    colors.mappedColors.mapKeys([series[0].name]);
    const outputColor = colors.mappedColors.get(series[0].name);

    return lightenColor(outputColor, series.length, series[0].maxDepth);
  }
  return {
    id: 'kibana_palette',
    getColor,
    ...buildStatelessExpressionIntegration('kibana_palette', getColor),
    getPreviewPalette: () => {
      return colors.seedColors.slice(0, 10);
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
) => Record<string, SerializableColorFunctionDefinition> = ({ charts }) => {
  const buildRoundRobinCategorical = (id: string, colors: (n: number) => string[]) => {
    return buildRoundRobinCategoricalWithMappedColors(charts.colors, id, colors);
  };
  return {
    default: {
      title: i18n.translate('xpack.lens.palettes.defaultPaletteLabel', {
        defaultMessage: 'default',
      }),
      ...buildRoundRobinCategorical('default', () => euiPaletteColorBlind()),
    },
    kibana_palette: {
      title: i18n.translate('xpack.lens.palettes.kibanaPaletteLabel', {
        defaultMessage: 'legacy',
      }),
      ...buildSyncedKibanaPalette(charts.colors),
    },
    status: {
      title: i18n.translate('xpack.lens.palettes.statusLabel', { defaultMessage: 'status' }),
      ...buildRoundRobinCategorical('status', euiPaletteForStatus),
    },
    complimentary: {
      title: i18n.translate('xpack.lens.palettes.complimentaryLabel', {
        defaultMessage: 'complimentary',
      }),
      ...buildRoundRobinCategorical('complimentary', euiPaletteComplimentary),
    },
    negative: {
      title: i18n.translate('xpack.lens.palettes.negativeLabel', { defaultMessage: 'negative' }),
      ...buildRoundRobinCategorical('negative', euiPaletteNegative),
    },
    positive: {
      title: i18n.translate('xpack.lens.palettes.positiveLabel', { defaultMessage: 'positive' }),
      ...buildRoundRobinCategorical('positive', euiPalettePositive),
    },
    cool: {
      title: i18n.translate('xpack.lens.palettes.coolLabel', { defaultMessage: 'cool' }),
      ...buildRoundRobinCategorical('cool', euiPaletteCool),
    },
    warm: {
      title: i18n.translate('xpack.lens.palettes.warmLabel', { defaultMessage: 'warm' }),
      ...buildRoundRobinCategorical('warm', euiPaletteWarm),
    },
    gray: {
      title: i18n.translate('xpack.lens.palettes.grayLabel', { defaultMessage: 'gray' }),
      ...buildRoundRobinCategorical('gray', euiPaletteGray),
    },
  };
};
