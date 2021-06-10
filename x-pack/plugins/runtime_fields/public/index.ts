/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RuntimeFieldEditorFlyoutContentProps, RuntimeFieldEditorProps } from './components';
export type {
  RuntimeFieldEditorFlyoutContentProps,
  RuntimeFieldFormState,
  RuntimeFieldEditorProps,
} from './components';
export { RUNTIME_FIELD_OPTIONS } from './constants';
export type { RuntimeField, RuntimeType } from './types';

// Export these react components asynchronously to avoid increasing the entry bundle size.
export async function getRuntimeFieldEditor(): Promise<
  React.FunctionComponent<RuntimeFieldEditorProps>
> {
  const { RuntimeFieldEditor } = await import('./components');
  return RuntimeFieldEditor;
}

export async function getRuntimeFieldEditorFlyoutContent(): Promise<
  React.FunctionComponent<RuntimeFieldEditorFlyoutContentProps>
> {
  const { RuntimeFieldEditorFlyoutContent } = await import('./components');
  return RuntimeFieldEditorFlyoutContent;
}

/** dummy plugin, we just want kibanaUtils to have its own bundle */
export function plugin() {
  return new (class RuntimeFieldsPlugin {
    setup() {}
    start() {}
  })();
}
