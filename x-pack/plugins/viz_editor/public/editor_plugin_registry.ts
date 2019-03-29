/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IconType } from '@elastic/eui';
import { DatasourceField } from '../common';
import { UnknownVisModel, VisModel } from '../public/common/lib';

import { config as pieChartConfig } from './pseudo_plugins/pie_chart_plugin';
import { config as vegaChartConfig } from './pseudo_plugins/vega_chart_plugin';
import { config as xyChartConfig } from './pseudo_plugins/xy_chart_plugin';

export interface Suggestion<S extends VisModel = VisModel> {
  pluginName: string;
  previewExpression: string;
  score: number;
  visModel: S;
  title: string;
  iconType: IconType;
}

export type GetSuggestionsType<S extends VisModel> = (
  datasourceName: string,
  field: DatasourceField,
  visModel: S
) => Array<Suggestion<S>>;

export interface PanelComponentProps<S extends VisModel = VisModel> {
  visModel: S;
  onChangeVisModel: (newState: S) => void;
  getSuggestionsForField?: GetSuggestionsType<S>;
}

/**
 * each editorplugin has to register itself and has to provide these four things:
 * >> an editor panels builder, which gets passed the current state and updater functions
 *    for the current state and returns two rendered react elements for the left and the right panel (might be extended later)
 * >> a toExpression function which takes the current state and turns it into an expression. should be completely pure
 * >> a toSuggestions function - returns suggestions of how this plugin could render the current state (used to populate a list of suggested configurations in the side bar)
 *    Also contains a score which is used to sort the suggestions from all plugins
 * >> a getSuggestionsFromField function - returns suggestions for what the plugin could do with a single field
 */

export interface EditorPlugin<S extends VisModel = VisModel> {
  name: string;
  ConfigPanel: React.ComponentType<PanelComponentProps<S>>;
  HeaderPanel?: React.ComponentType<PanelComponentProps<S>>;
  WorkspacePanel?: React.ComponentType<PanelComponentProps<S>>;
  toExpression?: (visModel: S, mode: 'view' | 'edit') => string;
  getChartSuggestions?: (visModel: S) => Array<Suggestion<S>>;
  getInitialState: (visModel: UnknownVisModel) => S;
  getSuggestionsForField?: GetSuggestionsType<S>;
}

const pluginMap: { [key: string]: EditorPlugin<any> } = {
  xy_chart: xyChartConfig,
  pie_chart: pieChartConfig,
  vega_chart: vegaChartConfig,
};

// TODO: Expose this to other pluins so editor configs can be injected
export const registry = {
  getByName(pluginName: string) {
    if (pluginMap[pluginName]) {
      return pluginMap[pluginName];
    }

    throw new Error('editor plugin not found');
  },
  register(name: string, config: any) {
    pluginMap[name] = config;
  },
  getAll() {
    return Object.values(pluginMap);
  },
};
