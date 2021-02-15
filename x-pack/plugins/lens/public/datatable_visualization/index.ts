/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/public';
import { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import { EditorFrameSetup, FormatFactory } from '../types';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';

interface DatatableVisualizationPluginStartPlugins {
  data: DataPublicPluginStart;
}
export interface DatatableVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: Promise<FormatFactory>;
  editorFrame: EditorFrameSetup;
}

export class DatatableVisualization {
  constructor() {}

  setup(
    core: CoreSetup<DatatableVisualizationPluginStartPlugins, void>,
    { expressions, formatFactory, editorFrame }: DatatableVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const {
        getDatatable,
        datatableColumns,
        getDatatableRenderer,
        datatableVisualization,
      } = await import('../async_services');
      const resolvedFormatFactory = await formatFactory;

      expressions.registerFunction(() => datatableColumns);
      expressions.registerFunction(() => getDatatable({ formatFactory: resolvedFormatFactory }));
      expressions.registerRenderer(() =>
        getDatatableRenderer({
          formatFactory: resolvedFormatFactory,
          getType: core
            .getStartServices()
            .then(([_, { data: dataStart }]) => dataStart.search.aggs.types.get),
        })
      );
      return datatableVisualization;
    });
  }
}
