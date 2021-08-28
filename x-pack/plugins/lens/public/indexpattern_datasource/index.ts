/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup } from '../../../../../src/core/public/types';
import type { ChartsPluginSetup } from '../../../../../src/plugins/charts/public/types';
import type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../../src/plugins/data/public/types';
import type { ExpressionsSetup } from '../../../../../src/plugins/expressions/public/plugin';
import type {
  FieldFormatsSetup,
  FieldFormatsStart,
} from '../../../../../src/plugins/field_formats/public/plugin';
import type { PluginStart as IndexPatternFieldEditorStart } from '../../../../../src/plugins/index_pattern_field_editor/public/types';
import { Storage } from '../../../../../src/plugins/kibana_utils/public/storage/storage';
import type { UiActionsStart } from '../../../../../src/plugins/ui_actions/public/plugin';
import type { Datasource, EditorFrameSetup } from '../types';
import { getTimeZone } from '../utils';

export interface IndexPatternDatasourceSetupPlugins {
  expressions: ExpressionsSetup;
  fieldFormats: FieldFormatsSetup;
  data: DataPublicPluginSetup;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export interface IndexPatternDatasourceStartPlugins {
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  indexPatternFieldEditor: IndexPatternFieldEditorStart;
  uiActions: UiActionsStart;
}

export class IndexPatternDatasource {
  constructor() {}

  setup(
    core: CoreSetup<IndexPatternDatasourceStartPlugins>,
    {
      fieldFormats: fieldFormatsSetup,
      expressions,
      editorFrame,
      charts,
    }: IndexPatternDatasourceSetupPlugins
  ) {
    editorFrame.registerDatasource(async () => {
      const {
        getIndexPatternDatasource,
        renameColumns,
        formatColumn,
        counterRate,
        getTimeScale,
        getSuffixFormatter,
      } = await import('../async_services');
      return core
        .getStartServices()
        .then(([coreStart, { indexPatternFieldEditor, uiActions, data, fieldFormats }]) => {
          const suffixFormatter = getSuffixFormatter(fieldFormats.deserialize);
          if (!fieldFormats.has(suffixFormatter.id)) {
            // todo: this code should be executed on setup phase.
            fieldFormatsSetup.register([suffixFormatter]);
          }
          expressions.registerFunction(getTimeScale(() => getTimeZone(core.uiSettings)));
          expressions.registerFunction(counterRate);
          expressions.registerFunction(renameColumns);
          expressions.registerFunction(formatColumn);
          return getIndexPatternDatasource({
            core: coreStart,
            fieldFormats,
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
