/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingServerSetup } from '@kbn/alerting-plugin/server';
import { IBasePath, Logger } from '@kbn/core/server';
import { CustomThresholdLocators } from './custom_threshold/custom_threshold_executor';
import { ObservabilityConfig } from '../..';
import { thresholdRuleType } from './custom_threshold/register_custom_threshold_rule_type';

export function registerRuleTypes(
  alertingPlugin: AlertingServerSetup,
  basePath: IBasePath,
  config: ObservabilityConfig,
  logger: Logger,
  locators: CustomThresholdLocators
) {
  alertingPlugin.registerType(thresholdRuleType(basePath, config, logger, locators));
}
