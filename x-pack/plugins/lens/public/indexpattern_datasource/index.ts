/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/public';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { getIndexPatternDatasource } from './indexpattern';
import { renameColumns } from './rename_columns';
import { ExpressionsSetup, KibanaDatatable } from '../../../../../src/plugins/expressions/public';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../../src/plugins/data/public';
import { Datasource, EditorFrameSetup } from '../types';
import { IndexPatternColumn, operationDefinitionMap } from './operations';

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
    // TODO register client side calculation logic
    expressions.registerFunction({
      name: 'lens_client_calculations',
      type: 'kibana_datatable',
      help: '',
      args: {
        tree: {
          types: ['string'],
          help: 'The tree to execute',
        },
      },
      inputTypes: ['kibana_datatable'],
      fn(data: KibanaDatatable, { tree: treeJSON }) {
        const tree = JSON.parse(treeJSON) as IndexPatternColumn;

        const nodesToProcess: IndexPatternColumn[] = [];

        const nodeQueue = [tree];

        while (nodeQueue.length > 0) {
          const currentNode = nodeQueue.shift();
          if (currentNode!.isClientSideOperation) {
            // put the leaves first, then go up to the root
            nodesToProcess.unshift(currentNode!);
          }
          nodeQueue.push(...(currentNode.children || []));
        }

        let dataResult = { ...data };

        nodesToProcess.forEach((node) => {
          const execFn = operationDefinitionMap[node.operationType].clientSideExecution;
          if (execFn) {
            dataResult = execFn(node, dataResult);
          }
        });

        return dataResult;
      },
    });

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
