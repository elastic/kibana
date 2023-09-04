/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import {
  createKibanaReactContext,
  KibanaReactContextValue,
  useKibana,
} from '@kbn/kibana-react-plugin/public';
import { useMemo } from 'react';
import { ObservabilityLogExplorerPluginStart, ObservabilityLogExplorerStartDeps } from '../types';

export type PluginKibanaContextValue = CoreStart &
  ObservabilityLogExplorerStartDeps &
  ObservabilityLogExplorerPluginStart;

export const createKibanaContextForPlugin = (
  core: CoreStart,
  plugins: ObservabilityLogExplorerStartDeps,
  pluginStart: ObservabilityLogExplorerPluginStart
) =>
  createKibanaReactContext<PluginKibanaContextValue>({
    ...core,
    ...plugins,
    ...pluginStart,
  });

export const useKibanaContextForPlugin =
  useKibana as () => KibanaReactContextValue<PluginKibanaContextValue>;

export const useKibanaContextForPluginProvider = (
  core: CoreStart,
  plugins: ObservabilityLogExplorerStartDeps,
  pluginStart: ObservabilityLogExplorerPluginStart
) => {
  const { Provider } = useMemo(
    () => createKibanaContextForPlugin(core, plugins, pluginStart),
    [core, pluginStart, plugins]
  );

  return Provider;
};
