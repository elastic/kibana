/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VisModel } from './common';

import { config as csvPlugin } from './pseudo_plugins/csv_datasource_plugin';
import { config as essqlPlugin } from './pseudo_plugins/essql_datasource_plugin';
import { config as indexpatternPlugin } from './pseudo_plugins/indexpattern_datasource_plugin';

export interface DatasourcePanelProps<S extends VisModel = VisModel> {
  visModel: S;
  onChangeVisModel: (newState: S) => void;
}

export interface DatasourcePlugin<S extends VisModel = VisModel> {
  name: string;
  toExpression: (visModel: S, mode?: 'preview' | 'full') => string;
  DataPanel: React.ComponentType<DatasourcePanelProps<S>>;
  icon: string;
}

const datasourceMap: { [key: string]: DatasourcePlugin } = {
  index_pattern: indexpatternPlugin,
  essql: essqlPlugin,
  csv: csvPlugin,
};

// TODO: Expose this to other pluins so editor configs can be injected
export const datasourceRegistry = {
  getByName(datasourceName: string) {
    if (datasourceMap[datasourceName]) {
      return datasourceMap[datasourceName];
    }
    throw new Error('datasource not found');
  },
  register(name: string, config: any) {
    datasourceMap[name] = config;
  },
  getAll() {
    return Object.values(datasourceMap);
  },
};
