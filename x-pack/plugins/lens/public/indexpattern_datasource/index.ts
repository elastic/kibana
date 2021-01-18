/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/public';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../../src/plugins/data/public';
import { Datasource, EditorFrameSetup } from '../types';

export interface IndexPatternDatasourceSetupPlugins {
  expressions: ExpressionsSetup;
  data: DataPublicPluginSetup;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export interface IndexPatternDatasourceStartPlugins {
  data: DataPublicPluginStart;
}

export class IndexPatternDatasource {
  constructor() {}

  setup(
    core: CoreSetup<IndexPatternDatasourceStartPlugins>,
    { expressions, editorFrame, charts }: IndexPatternDatasourceSetupPlugins
  ) {
    editorFrame.registerDatasource(async () => {
      const {
        getIndexPatternDatasource,
        renameColumns,
        formatColumn,
        counterRate,
        getTimeScaleFunction,
        getSuffixFormatter,
      } = await import('../async_services');
      return core.getStartServices().then(([coreStart, { data }]) => {
        data.fieldFormats.register([getSuffixFormatter(data.fieldFormats.deserialize)]);
        expressions.registerFunction(getTimeScaleFunction(data));
        expressions.registerFunction(counterRate);
        expressions.registerFunction(renameColumns);
        expressions.registerFunction(formatColumn);
        return getIndexPatternDatasource({
          core: coreStart,
          storage: new Storage(localStorage),
          data,
          charts,
        });
      }) as Promise<Datasource>;
    });
  }
}
