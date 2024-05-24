/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
export interface IntegrationAssistantPluginSetup {
  runEcsGraph: () => string;
  runRelatedGraph: () => string;
  runCategorizationGraph: () => string;
  runIntegrationBuilder: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IntegrationAssistantPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}

export interface EcsMappingTableItem {
  sourceField: string;
  destinationField: string;
  isEcs: boolean;
  description: string;
  id: string;
  exampleValue: any;
}
