/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RUNTIME_FIELD_TYPES } from './constants';
import { OpenRuntimeFieldEditorProps } from './load_editor';

export interface LoadEditorResponse {
  openEditor(props: OpenRuntimeFieldEditorProps): () => void;
}

export interface PluginSetup {
  loadEditor(): Promise<LoadEditorResponse>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupPlugins {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartPlugins {}

export type RuntimeType = typeof RUNTIME_FIELD_TYPES[number];

export interface RuntimeField {
  name: string;
  type: RuntimeType;
  script: {
    source: string;
  };
}

export interface ComboBoxOption<T = unknown> {
  label: string;
  value?: T;
}
