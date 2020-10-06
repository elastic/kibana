/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext } from 'react';
import { CoreStart } from 'kibana/public';

export interface PluginContextValue {
  core: CoreStart;
}

export const PluginContext = createContext({} as PluginContextValue);
