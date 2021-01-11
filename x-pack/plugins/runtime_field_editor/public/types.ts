/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DataPublicPluginStart } from 'src/plugins/data/public';
export type {
  RuntimeField,
  RuntimeType,
  RUNTIME_FIELD_TYPES,
} from 'src/plugins/runtime_fields/common';

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

export interface StartPlugins {
  data: DataPublicPluginStart;
}

export interface ComboBoxOption<T = unknown> {
  label: string;
  value?: T;
}
