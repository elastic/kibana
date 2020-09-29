/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { createContext } from 'react';
import { ConfigSchema } from '../../';
import { ApmPluginSetupDeps } from '../../plugin';

export interface ApmPluginContextValue {
  config: ConfigSchema;
  core: CoreStart;
  plugins: ApmPluginSetupDeps;
}

export const ApmPluginContext = createContext({} as ApmPluginContextValue);
