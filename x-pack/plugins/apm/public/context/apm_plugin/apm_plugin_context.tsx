/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AppMountParameters, CoreStart } from 'kibana/public';
import { createContext } from 'react';
import type { ConfigSchema } from '../..';
import type { Start as InspectorPluginStart } from '../../../../../../src/plugins/inspector/public';
import type { MapsStartApi } from '../../../../maps/public';
import type {
  ObservabilityPublicStart,
  ObservabilityRuleTypeRegistry,
} from '../../../../observability/public';
import type { ApmPluginSetupDeps } from '../../plugin';

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
