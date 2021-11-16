/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/public';
import { get } from 'lodash';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { getEsDSLDatasource } from './esdsl';
import { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../../src/plugins/data/public';
import { Datasource, EditorFrameSetup } from '../types';

export interface IndexPatternDatasourceSetupPlugins {
  expressions: ExpressionsSetup;
  data: DataPublicPluginSetup;
  editorFrame: EditorFrameSetup;
}

export interface IndexPatternDatasourceStartPlugins {
  data: DataPublicPluginStart;
}

export class EsDSLDatasource {
  constructor() {}

  setup(
    core: CoreSetup<IndexPatternDatasourceStartPlugins>,
    { expressions, editorFrame }: IndexPatternDatasourceSetupPlugins
  ) {
    editorFrame.registerDatasource(
      core.getStartServices().then(([coreStart, { data }]) =>
        getEsDSLDatasource({
          core: coreStart,
          storage: new Storage(localStorage),
          data,
        })
      ) as Promise<Datasource>
    );
  }
}
