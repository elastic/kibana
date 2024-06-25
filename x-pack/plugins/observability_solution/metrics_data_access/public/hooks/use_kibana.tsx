/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CoreStart } from '@kbn/core/public';
import {
  createKibanaReactContext,
  KibanaReactContextValue,
  useKibana,
} from '@kbn/kibana-react-plugin/public';

export type PluginKibanaContextValue = CoreStart;

export const createKibanaContextForPlugin = (core: CoreStart) =>
  createKibanaReactContext<PluginKibanaContextValue>({
    ...core,
  });

export const useKibanaContextForPlugin =
  useKibana as () => KibanaReactContextValue<PluginKibanaContextValue>;

export const useKibanaContextForPluginProvider = (core: CoreStart) => {
  const { Provider } = useMemo(() => createKibanaContextForPlugin(core), [core]);

  return Provider;
};
