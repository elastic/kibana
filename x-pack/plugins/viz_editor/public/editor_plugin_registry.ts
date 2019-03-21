/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ViewModel } from '../common/lib';
import { config as pieChartConfig } from '../pie_chart_plugin';
import { config as xyChartConfig } from '../xy_chart_plugin';

export interface PanelComponentProps<S extends ViewModel = ViewModel> {
  viewModel: S;
  onChangeViewModel: (newState: S) => void;
}

export interface Suggestion<S extends ViewModel = ViewModel> {
  pluginName: string;
  previewExpression: string;
  score: number;
  viewModel: S;
  title: string;
  iconType: string;
}

/**
 * each editorplugin has to register itself and has to provide these four things:
 * >> an editor panels builder, which gets passed the current state and updater functions
 *    for the current state and returns two rendered react elements for the left and the right panel (might be extended later)
 * >> a toExpression function which takes the current state and turns it into an expression. should be completely pure
 * >> a toSuggestions function - returns suggestions of how this plugin could render the current state (used to populate a list of suggested configurations in the side bar)
 *    Also contains a score which is used to sort the suggestions from all plugins
 */

export interface EditorPlugin<S extends ViewModel = ViewModel> {
  name: string;
  DataPanel: React.ComponentType<PanelComponentProps<S>>;
  ConfigPanel: React.ComponentType<PanelComponentProps<S>>;
  HeaderPanel?: React.ComponentType<PanelComponentProps<S>>;
  WorkspacePanel?: React.ComponentType<PanelComponentProps<S>>;
  toExpression: (viewModel: S, mode: 'view' | 'edit') => string;
  getSuggestions: (viewModel: S) => Array<Suggestion<S>>;
  getInitialState: (viewModel: ViewModel<string, unknown>) => ViewModel<string, unknown>;
}

const pluginMap: { [key: string]: EditorPlugin<any> } = {
  xy_chart: xyChartConfig,
  pie_chart: pieChartConfig,
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
