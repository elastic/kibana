/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from 'kibana/public';
import type { ExpressionsSetup } from '../../../../../../src/plugins/expressions/public';
import type { EditorFrameSetup } from '../../types';
import type {
  ChartsPluginSetup,
  ChartColorConfiguration,
  PaletteDefinition,
  SeriesLayer,
} from '../../../../../../src/plugins/charts/public';
import type { FormatFactory } from '../../../common';

export interface GaugeVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: FormatFactory;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

const transparentize = (color: string | null) => (color ? color + `80` : `000000`);

const paletteModifier = (palette: PaletteDefinition<unknown>) => ({
  ...palette,
  getCategoricalColor: (
    series: SeriesLayer[],
    chartConfiguration?: ChartColorConfiguration,
    state?: unknown
  ) => transparentize(palette.getCategoricalColor(series, chartConfiguration, state)),
  getCategoricalColors: (size: number, state: unknown): string[] =>
    palette.getCategoricalColors(size, state).map(transparentize),
});

export class GaugeVisualization {
  setup(
    core: CoreSetup,
    { expressions, formatFactory, editorFrame, charts }: GaugeVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const { getGaugeVisualization, getGaugeRenderer } = await import('../../async_services');
      const initialPalettes = await charts.palettes.getPalettes();

      const palettes = {
        ...initialPalettes,
        get: (name: string) => paletteModifier(initialPalettes.get(name)),
        getAll: () =>
          initialPalettes.getAll().map((singlePalette) => paletteModifier(singlePalette)),
      };

      expressions.registerRenderer(
        getGaugeRenderer({
          formatFactory,
          chartsThemeService: charts.theme,
          paletteService: palettes,
        })
      );
      return getGaugeVisualization({ paletteService: palettes });
    });
  }
}
