/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VisModel } from './common/lib';

import { config as essqlPlugin } from '../essql_datasource_plugin';
import { config as indexpatternPlugin } from '../indexpattern_datasource_plugin';

export interface PanelComponentProps<S extends VisModel = VisModel> {
  visModel: S;
  onChangeVisModel: (newState: S) => void;
}

export interface DatasourcePlugin<S extends VisModel = VisModel> {
  name: string;
  toExpression?: (visModel: S, mode: 'view' | 'edit') => string;
  DataPanel: React.ComponentType<PanelComponentProps<S>>;
}

const datasourceMap: { [key: string]: DatasourcePlugin } = {
  index_pattern: indexpatternPlugin,
  essql: essqlPlugin,
};

// TODO: Expose this to other pluins so editor configs can be injected
export const registry = {
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
