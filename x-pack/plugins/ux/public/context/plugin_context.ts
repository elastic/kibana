/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters } from '@kbn/core/public';
import type { ExploratoryViewPublicStart } from '@kbn/exploratory-view-plugin/public';
import { createContext } from 'react';

export interface PluginContextValue {
  appMountParameters: AppMountParameters;
  exploratoryView: ExploratoryViewPublicStart;
}

export const PluginContext = createContext({} as PluginContextValue);
