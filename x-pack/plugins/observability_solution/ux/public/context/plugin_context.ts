/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { AppMountParameters } from '@kbn/core/public';
import type { ExploratoryViewPublicStart } from '@kbn/exploratory-view-plugin/public';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';

export interface PluginContextValue {
  appMountParameters: AppMountParameters;
  exploratoryView: ExploratoryViewPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  spaceId: string;
}

export const PluginContext = createContext({} as PluginContextValue);
