/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/public';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';
import { IndexPatternFieldEditorStart } from '../../../../../src/plugins/index_pattern_field_editor/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../../src/plugins/data/public';
import { Datasource, EditorFrameSetup } from '../types';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';

export interface IndexPatternDatasourceSetupPlugins {
  expressions: ExpressionsSetup;
  data: DataPublicPluginSetup;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export interface IndexPatternDatasourceStartPlugins {
  data: DataPublicPluginStart;
  indexPatternFieldEditor: IndexPatternFieldEditorStart;
  uiActions: UiActionsStart;
}

export class IndexPatternDatasource {
  constructor() {}

  setup(
    core: CoreSetup<IndexPatternDatasourceStartPlugins>,
    { expressions, editorFrame, charts, data: dataSetup }: IndexPatternDatasourceSetupPlugins
  ) {
    editorFrame.registerDatasource(async () => {
      const {
        getIndexPatternDatasource,
        renameColumns,
        formatColumn,
        counterRate,
        timeScale,
        getSuffixFormatter,
      } = await import('../async_services');
      return core
        .getStartServices()
        .then(([coreStart, { indexPatternFieldEditor, uiActions, data }]) => {
          const suffixFormatter = getSuffixFormatter(() => data.fieldFormats.deserialize);
          if (!dataSetup.fieldFormats.has(suffixFormatter.id)) {
            dataSetup.fieldFormats.register([suffixFormatter]);
          }
          expressions.registerFunction(timeScale);
          expressions.registerFunction(counterRate);
          expressions.registerFunction(renameColumns);
          expressions.registerFunction(formatColumn);
          return getIndexPatternDatasource({
            core: coreStart,
            storage: new Storage(localStorage),
            data,
            charts,
            indexPatternFieldEditor,
            uiActions,
          });
        }) as Promise<Datasource>;
    });
  }
}
