/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { createContext } from 'react';
import type { MapsStartApi } from '@kbn/maps-plugin/public';
import type { Start as InspectorPluginStart } from '@kbn/inspector-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { SharePluginSetup } from '@kbn/share-plugin/public';
import { ConfigSchema, ObservabilityPluginSetupDependencies } from '../../../../types';
import type { KibanaEnvContext } from '../kibana_environment_context/kibana_environment_context';
import { ObservabilityRuleTypeRegistry } from '../../../alerts_and_slos/rules/create_observability_rule_type_registry';

export interface ApmPluginContextValue {
  appMountParameters: AppMountParameters;
  config: ConfigSchema;
  core: CoreStart;
  inspector: InspectorPluginStart;
  plugins: ObservabilityPluginSetupDependencies & { maps?: MapsStartApi };
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  dataViews: DataViewsPublicPluginStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  uiActions: UiActionsStart;
  share: SharePluginSetup;
  kibanaEnvironment: KibanaEnvContext;
}

export const ApmPluginContext = createContext({} as ApmPluginContextValue);
