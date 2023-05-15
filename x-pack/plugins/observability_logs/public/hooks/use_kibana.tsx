/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren } from 'react';
import { CoreStart } from '@kbn/core/public';
import {
  createKibanaReactContext,
  KibanaReactContextValue,
  useKibana,
} from '@kbn/kibana-react-plugin/public';
import { useMemo } from 'react';
import { ObservabilityLogsPluginStart, ObservabilityLogsStartDeps } from '../types';

export type ObservabilityLogsContext = CoreStart &
  ObservabilityLogsStartDeps &
  ObservabilityLogsPluginStart;

export const useObservabilityLogsPlugin =
  useKibana as () => KibanaReactContextValue<ObservabilityLogsContext>;

export interface ObservabilityLogsPluginProviderProps {
  core: CoreStart;
  plugins: ObservabilityLogsStartDeps;
  pluginStart: ObservabilityLogsPluginStart;
}

export const ObservabilityLogsPluginProvider = ({
  core,
  plugins,
  pluginStart,
  children,
}: PropsWithChildren<ObservabilityLogsPluginProviderProps>) => {
  const context = useMemo(
    () => ({ ...core, ...plugins, ...pluginStart }),
    [core, pluginStart, plugins]
  );

  const { Provider } = createKibanaReactContext<ObservabilityLogsContext>(context);

  return <Provider services={context} children={children} />;
};
