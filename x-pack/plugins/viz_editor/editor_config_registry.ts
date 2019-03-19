/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { config as sampleConfig } from './sample_vis_plugin';

export interface StandardVisState {
  title: string;
  colorPalette?: [string];
  columns: Array<{ ref: number; label: string; generator?: string }>;
  query: object; // TODO introduce complete "Query" type. We definitewly want to type this very well
}

export interface EditorComponentProps<S> {
  standardState: StandardVisState;
  customState: S;
  onChangeStandardState: (newState: StandardVisState) => void;
  onChangeCustomState: (newState: S) => void;
}

export type EditorPanelsBuilder<S = any> = (
  props: EditorComponentProps<S>
) => { leftPanel: JSX.Element; rightPanel: JSX.Element };

export interface Suggestion<S = any> {
  expression: string;
  score: number;
  standardVisState: StandardVisState;
  customVisState: S;
  title: string;
}

/**
 * each editorconfig has to register itself and has to provide these four things:
 * >> an editor panels builder, which gets passed the current state and updater functions
 *    for the current state and returns two rendered react elements for the left and the right panel (might be extended later)
 * >> a toExpression function which takes the current state and turns it into an expression. should be completely pure
 * >> a toSuggestions function - returns suggestions of how this plugin could render the current state (used to populate a list of suggested configurations in the side bar)
 *    Also contains a score which is used to sort the suggestions from all plugins
 */

export interface EditorConfig<S = any> {
  editorPanels: EditorPanelsBuilder<S>;
  toExpression: (standardVisState: StandardVisState, customVisState: S) => string;
  getSuggestions: (standardVisState: StandardVisState, customVisState: S) => Array<Suggestion<S>>;
  defaultStandardState: StandardVisState;
  defaultCustomState: S;
}

const configMap: { [key: string]: EditorConfig } = {
  sample: sampleConfig,
};

// TODO: Expose this to other pluins so editor configs can be injected
export const registry = {
  getByName(editorConfigName: string) {
    if (configMap[editorConfigName]) {
      return configMap[editorConfigName];
    }
    throw new Error('editorConfig not found');
  },
  register(name: string, config: any) {
    configMap[name] = config;
  },
  getAll() {
    return Object.entries(configMap);
  },
};
