/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { EditorFrameSetup } from '../types';

export interface TextBasedLanguageSetupPlugins {
  data: DataPublicPluginSetup;
  editorFrame: EditorFrameSetup;
}

export interface TextBasedLanguageStartPlugins {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  expressions: ExpressionsStart;
}

export class TextBasedLanguagesDatasource {
  constructor() {}

  setup(
    core: CoreSetup<TextBasedLanguageStartPlugins>,
    { editorFrame }: TextBasedLanguageSetupPlugins
  ) {
    editorFrame.registerDatasource(async () => {
      const { getTextBasedLanguagesDatasource } = await import('../async_services');
      const [coreStart, { data, dataViews, expressions }] = await core.getStartServices();

      return getTextBasedLanguagesDatasource({
        core: coreStart,
        storage: new Storage(localStorage),
        data,
        dataViews,
        expressions,
      });
    });
  }
}
