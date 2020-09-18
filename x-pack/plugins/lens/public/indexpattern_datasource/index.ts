/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/public';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { getIndexPatternDatasource } from './indexpattern';
import { renameColumns } from './rename_columns';
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
    expressions.registerFunction(renameColumns);

    editorFrame.registerDatasource(
      core.getStartServices().then(([coreStart, { data }]) =>
        getIndexPatternDatasource({
          core: coreStart,
          storage: new Storage(localStorage),
          data,
          charts,
        })
      ) as Promise<Datasource>
    );
  }
}
