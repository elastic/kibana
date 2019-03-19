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

/**
 * each editorconfig has to register itself and has to provide these four things:
 * >> an editor panels builder, which gets passed the current state and updater functions
 *    for the current state and returns two rendered react elements for the left and the right panel (might be extended later)
 * >> a toExpression function which takes the current state and turns it into an expression. should be completely pure
 * >> a toSuggestionExpression function - same thing, but is used to build the expression for the suggestions. There might be no customVisState (because the user started configuring in another plugin)
 * >> a suggestionScore function - takes the name of the currently active plugin and the current standard state and returns a score which is used to sort the suggestions. 0 means it wont be rendered at all
 */

export interface EditorConfig<S = any> {
  editorPanels: EditorPanelsBuilder<S>;
  toExpression: (standardVisState: StandardVisState, customVisState: S) => string;
  toSuggestionExpression: (standardVisState: StandardVisState, customVisState: S) => string;
  suggestionScore: (pluginName: string, state: StandardVisState) => number;
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
