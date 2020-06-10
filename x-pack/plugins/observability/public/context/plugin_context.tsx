/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext } from 'react';
import { AppMountContext } from 'kibana/public';
import { ObservabilityDataAccessService } from '../data_access_service';

export interface PluginContextValue {
  core: AppMountContext['core'];
  observabilityData: ObservabilityDataAccessService;
}

export const PluginContext = createContext({} as PluginContextValue);
