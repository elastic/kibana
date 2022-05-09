/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { createContext } from 'react';
import type { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';
import { MapsStartApi } from '@kbn/maps-plugin/public';
import { ObservabilityPublicStart } from '@kbn/observability-plugin/public';
import { Start as InspectorPluginStart } from '@kbn/inspector-plugin/public';
import { ApmPluginSetupDeps } from '../../plugin';
import { ConfigSchema } from '../..';

export interface ApmPluginContextValue {
  appMountParameters: AppMountParameters;
  config: ConfigSchema;
  core: CoreStart;
  inspector: InspectorPluginStart;
  plugins: ApmPluginSetupDeps & { maps?: MapsStartApi };
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  observability: ObservabilityPublicStart;
}

export const ApmPluginContext = createContext({} as ApmPluginContextValue);
