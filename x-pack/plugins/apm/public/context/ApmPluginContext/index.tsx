/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext } from 'react';
import { AppMountContext } from 'kibana/public';
import { ConfigSchema } from '../..';
import { ApmPluginSetupDeps } from '../../plugin';

export type AppMountContextBasePath = AppMountContext['core']['http']['basePath'];

export interface ApmPluginContextValue {
  config: ConfigSchema;
  core: AppMountContext['core'];
  plugins: ApmPluginSetupDeps;
}

export const ApmPluginContext = createContext({} as ApmPluginContextValue);
