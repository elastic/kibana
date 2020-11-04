/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RuntimeFieldsPlugin } from './plugin';

export {
  RuntimeFieldEditorFlyoutContent,
  RuntimeFieldEditor,
  RuntimeFieldFormState,
} from './components';
export { RUNTIME_FIELD_OPTIONS } from './constants';
export { RuntimeField, RuntimeType, PluginSetup as RuntimeFieldsSetup } from './types';

export function plugin() {
  return new RuntimeFieldsPlugin();
}
