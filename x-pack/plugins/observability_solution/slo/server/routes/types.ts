/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import { CoreSetup, KibanaRequest } from '@kbn/core/server';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import {
  AlertsClient,
  RuleDataPluginService,
  RuleRegistryPluginSetupContract,
} from '@kbn/rule-registry-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';

export interface SLORoutesDependencies {
  pluginsSetup: {
    core: CoreSetup;
    ruleRegistry: RuleRegistryPluginSetupContract;
  };
  getSpacesStart: () => Promise<SpacesPluginStart | undefined>;
  ruleDataService: RuleDataPluginService;
  getRulesClientWithRequest: (request: KibanaRequest) => Promise<RulesClientApi>;
  getRacClientWithRequest: (request: KibanaRequest) => Promise<AlertsClient>;
  getDataViewsStart: () => Promise<DataViewsServerPluginStart>;
}

export type SLORouteHandlerResources = SLORoutesDependencies & DefaultRouteHandlerResources;
