/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createContext } from 'react';
import type { ConfigSchema } from '../..';
import type { CoreStart } from '../../../../../../src/core/public/types';
import type { AppMountParameters } from '../../../../../../src/core/public/application/types';
import type { MapsStartApi } from '../../../../maps/public/api/start_api';
import type { ObservabilityPublicStart } from '../../../../observability/public/plugin';
import type { ObservabilityRuleTypeRegistry } from '../../../../observability/public/rules/create_observability_rule_type_registry';
import type { ApmPluginSetupDeps } from '../../plugin';

export interface ApmPluginContextValue {
  appMountParameters: AppMountParameters;
  config: ConfigSchema;
  core: CoreStart;
  plugins: ApmPluginSetupDeps & { maps?: MapsStartApi };
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  observability: ObservabilityPublicStart;
}

export const ApmPluginContext = createContext({} as ApmPluginContextValue);
