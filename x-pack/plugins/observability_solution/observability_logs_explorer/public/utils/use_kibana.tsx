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
import {
  ObservabilityLogExplorerAppMountParameters,
  ObservabilityLogExplorerPluginStart,
  ObservabilityLogExplorerStartDeps,
} from '../types';

export type PluginKibanaContextValue = CoreStart &
  ObservabilityLogExplorerStartDeps &
  ObservabilityLogExplorerPluginStart & {
    appParams: ObservabilityLogExplorerAppMountParameters;
  };

export const createKibanaContextForPlugin = (
  core: CoreStart,
  plugins: ObservabilityLogExplorerStartDeps,
  pluginStart: ObservabilityLogExplorerPluginStart,
  appParams: ObservabilityLogExplorerAppMountParameters
) =>
  createKibanaReactContext<PluginKibanaContextValue>({
    ...core,
    ...plugins,
    ...pluginStart,
    appParams,
  });

export const useKibanaContextForPlugin =
  useKibana as () => KibanaReactContextValue<PluginKibanaContextValue>;

export const useKibanaContextForPluginProvider = (
  core: CoreStart,
  plugins: ObservabilityLogExplorerStartDeps,
  pluginStart: ObservabilityLogExplorerPluginStart,
  appParams: ObservabilityLogExplorerAppMountParameters
) => {
  const { Provider } = useMemo(
    () => createKibanaContextForPlugin(core, plugins, pluginStart, appParams),
    [appParams, core, pluginStart, plugins]
  );

  return Provider;
};
