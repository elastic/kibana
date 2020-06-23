/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/public';
import { datatableVisualization } from './visualization';
import { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import { datatable, datatableColumns, getDatatableRenderer } from './expression';
import { EditorFrameSetup, FormatFactory } from '../types';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';

interface DatatableVisualizationPluginStartPlugins {
  uiActions: UiActionsStart;
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
    expressions.registerFunction(() => datatableColumns);
    expressions.registerFunction(() => datatable);
    expressions.registerRenderer(() =>
      getDatatableRenderer({
        formatFactory,
        getType: core
          .getStartServices()
          .then(([_, { data: dataStart }]) => dataStart.search.aggs.types.get),
      })
    );
    editorFrame.registerVisualization(datatableVisualization);
  }
}
