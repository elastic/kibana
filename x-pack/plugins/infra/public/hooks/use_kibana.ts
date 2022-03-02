/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '../../../../../src/core/public';
import {
  createKibanaReactContext,
  KibanaReactContextValue,
  useKibana,
} from '../../../../../src/plugins/kibana_react/public';
import { InfraClientStartDeps, InfraClientStartExports } from '../types';

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
