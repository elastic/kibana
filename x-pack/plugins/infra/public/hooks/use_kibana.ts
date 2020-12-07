/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from '../../../../../src/core/public';
import {
  createKibanaReactContext,
  KibanaReactContextValue,
  useKibana,
} from '../../../../../src/plugins/kibana_react/public';
import { InfraClientStartDeps } from '../types';

export type PluginKibanaContextValue = CoreStart & InfraClientStartDeps;

export const createKibanaContextForPlugin = (core: CoreStart, pluginsStart: InfraClientStartDeps) =>
  createKibanaReactContext<PluginKibanaContextValue>({
    ...core,
    ...pluginsStart,
  });

export const useKibanaContextForPlugin = useKibana as () => KibanaReactContextValue<PluginKibanaContextValue>;
