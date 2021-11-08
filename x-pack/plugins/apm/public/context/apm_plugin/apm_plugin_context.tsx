/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import { createContext } from 'react';
import { ConfigSchema } from '../..';
import { ApmPluginSetupDeps, ApmPluginStartDeps } from '../../plugin';

export interface ApmPluginContextValue {
  config: ConfigSchema;
  pluginsSetup: ApmPluginSetupDeps;
  pluginsStart: ApmPluginStartDeps;
}

export const ApmPluginContext = createContext({} as ApmPluginContextValue);
