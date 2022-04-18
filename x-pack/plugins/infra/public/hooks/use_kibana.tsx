/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsOf } from '@elastic/eui';
import React, { useMemo } from 'react';
import { CoreStart } from '@kbn/core/public';
import {
  createKibanaReactContext,
  KibanaReactContextValue,
  useKibana,
} from '@kbn/kibana-react-plugin/public';
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

export const createLazyComponentWithKibanaContext = <T extends React.ComponentType<any>>(
  coreSetup: InfraClientCoreSetup,
  lazyComponentFactory: () => Promise<{ default: T }>
) =>
  React.lazy(() =>
    Promise.all([lazyComponentFactory(), coreSetup.getStartServices()]).then(
      ([{ default: LazilyLoadedComponent }, [core, plugins, pluginStart]]) => {
        const { Provider } = createKibanaContextForPlugin(core, plugins, pluginStart);

        return {
          default: (props: PropsOf<T>) => (
            <Provider>
              <LazilyLoadedComponent {...props} />
            </Provider>
          ),
        };
      }
    )
  );
