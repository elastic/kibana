/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IRouter } from '@kbn/core/server';
import { RuleRegistryPluginStartContract } from '@kbn/rule-registry-plugin/server';

export const registerRoutes = (router: IRouter, ruleRegistry: RuleRegistryPluginStartContract) => {
  // register new routes here
};
