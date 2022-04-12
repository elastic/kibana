/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from 'kibana/public';
import { createStartServicesGetter, Storage } from '../../../../../src/plugins/kibana_utils/public';
import type { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import type { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';
import type { IndexPatternFieldEditorStart } from '../../../../../src/plugins/data_view_field_editor/public';
import type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../../src/plugins/data/public';
import type { UnifiedSearchPublicPluginStart } from '../../../../../src/plugins/unified_search/public';
import type { DataViewsPublicPluginStart } from '../../../../../src/plugins/data_views/public';
import type { EditorFrameSetup } from '../types';
import type { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';
import type {
  FieldFormatsStart,
  FieldFormatsSetup,
} from '../../../../../src/plugins/field_formats/public';

export type { PersistedIndexPatternLayer, IndexPattern, FormulaPublicApi } from './types';

export interface IndexPatternDatasourceSetupPlugins {
  expressions: ExpressionsSetup;
  fieldFormats: FieldFormatsSetup;
  data: DataPublicPluginSetup;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export interface IndexPatternDatasourceStartPlugins {
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  dataViews: DataViewsPublicPluginStart;
  uiActions: UiActionsStart;
}

export class IndexPatternDatasource {
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
      const { getIndexPatternDatasource, getSuffixFormatter, suffixFormatterId } = await import(
        '../async_services'
      );

      if (!fieldFormatsSetup.has(suffixFormatterId)) {
        const startServices = createStartServicesGetter(core.getStartServices);
        const suffixFormatter = getSuffixFormatter(
          () => startServices().plugins.fieldFormats.deserialize
        );

        fieldFormatsSetup.register([suffixFormatter]);
      }

      const [
        coreStart,
        { dataViewFieldEditor, uiActions, data, fieldFormats, dataViews, unifiedSearch },
      ] = await core.getStartServices();

      return getIndexPatternDatasource({
        core: coreStart,
        fieldFormats,
        storage: new Storage(localStorage),
        data,
        unifiedSearch,
        dataViews,
        charts,
        dataViewFieldEditor,
        uiActions,
      });
    });
  }
}
