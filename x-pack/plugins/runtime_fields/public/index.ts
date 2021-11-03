/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuntimeFieldsPlugin } from './plugin';

export type { RuntimeFieldEditorFlyoutContentProps, RuntimeFieldFormState } from './components';
export { RuntimeFieldEditorFlyoutContent, RuntimeFieldEditor } from './components';
export { RUNTIME_FIELD_OPTIONS } from './constants';
export type { RuntimeField, RuntimeType, PluginSetup as RuntimeFieldsSetup } from './types';

export function plugin() {
  return new RuntimeFieldsPlugin();
}
