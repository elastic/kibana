/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-empty-interface*/
import {
  ItemDefinition,
  ItemDefinitionData,
  ItemDefinitionParams,
} from './investigation/item_definition_registry';

export interface ConfigSchema {}

export interface InvestigateSetupDependencies {}

export interface InvestigateStartDependencies {}

export interface InvestigatePublicSetup {
  registerItemDefinition: <
    Params extends ItemDefinitionParams = {},
    Data extends ItemDefinitionData = {}
  >(
    itemDefinition: ItemDefinition<Params, Data>
  ) => void;
}

export interface InvestigatePublicStart {
  getItemDefinitions: () => ItemDefinition[];
  getItemDefinitionByType: (type: string) => ItemDefinition | undefined;
}
