/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetupContract } from '@kbn/alerting-plugin/server';
// import { IBasePath, Logger } from '@kbn/core/server';
// import { IRuleDataService } from '@kbn/rule-registry-plugin/server';
import { datasetQualityRuleType } from './dataset_quality/register';

export function registerBurnRateRule(
  alertingPlugin: PluginSetupContract
  // basePath: IBasePath,
  // logger: Logger,
  // ruleDataService: IRuleDataService,
) {
  // Dataset Quality RULE
  alertingPlugin.registerType(datasetQualityRuleType()); // basePath, locators.alertsLocator));
}
