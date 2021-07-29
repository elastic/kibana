/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from 'kibana/public';
import type { ChartsPluginSetup } from 'src/plugins/charts/public';
import type { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import type { EditorFrameSetup } from '../types';
import type { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import type { FormatFactory } from '../../common';

interface DatatableVisualizationPluginStartPlugins {
  data: DataPublicPluginStart;
}
export interface DatatableVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: Promise<FormatFactory>;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export class DatatableVisualization {
  constructor() {}

  setup(
    core: CoreSetup<DatatableVisualizationPluginStartPlugins, void>,
    { expressions, formatFactory, editorFrame, charts }: DatatableVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const {
        getDatatable,
        datatableColumn,
        getDatatableRenderer,
        getDatatableVisualization,
      } = await import('../async_services');
      const palettes = await charts.palettes.getPalettes();
      const resolvedFormatFactory = await formatFactory;

      expressions.registerFunction(() => datatableColumn);
      expressions.registerFunction(() => getDatatable({ formatFactory: resolvedFormatFactory }));
      expressions.registerRenderer(() =>
        getDatatableRenderer({
          formatFactory: resolvedFormatFactory,
          getType: core
            .getStartServices()
            .then(([_, { data: dataStart }]) => dataStart.search.aggs.types.get),
          paletteService: palettes,
          uiSettings: core.uiSettings,
        })
      );
      return getDatatableVisualization({ paletteService: palettes });
    });
  }
}
