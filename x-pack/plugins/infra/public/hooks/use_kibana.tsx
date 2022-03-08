/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { CoreStart } from '../../../../../src/core/public';
import {
  createKibanaReactContext,
  KibanaReactContextValue,
  useKibana,
} from '../../../../../src/plugins/kibana_react/public';
import { InfraClientCoreSetup, InfraClientStartDeps, InfraClientStartExports } from '../types';

export type PluginKibanaContextValue = CoreStart & InfraClientStartDeps & InfraClientStartExports;

export const createKibanaContextForPlugin = (
  core: CoreStart,
  plugins: InfraClientStartDeps,
  pluginStart: InfraClientStartExports
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
  plugins: InfraClientStartDeps,
  pluginStart: InfraClientStartExports
) => {
  const { Provider } = useMemo(
    () => createKibanaContextForPlugin(core, plugins, pluginStart),
    [core, pluginStart, plugins]
  );

  return Provider;
};

export const createAsyncKibanaContextForPluginProvider =
  (coreSetup: InfraClientCoreSetup) =>
  ({ children }: React.PropsWithChildren<{}>) => {
    const [Provider, setProvider] = useState<React.ComponentType | undefined>(undefined);

    useEffect(() => {
      coreSetup
        .getStartServices()
        .then(([core, plugins, pluginStart]) =>
          setProvider(createKibanaContextForPlugin(core, plugins, pluginStart).Provider)
        );
    }, []);

    return Provider != null ? <Provider>{children}</Provider> : null;
  };
