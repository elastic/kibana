/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetupContract } from '@kbn/alerting-plugin/server';
import { IBasePath, Logger } from '@kbn/core/server';
import {
  createLifecycleExecutor,
  Dataset,
  IRuleDataService,
} from '@kbn/rule-registry-plugin/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import { CustomThresholdLocators } from './custom_threshold/custom_threshold_executor';
import { observabilityFeatureId } from '../../../common';
import { ObservabilityConfig } from '../..';
import { THRESHOLD_RULE_REGISTRATION_CONTEXT } from '../../common/constants';
import { thresholdRuleType } from './custom_threshold/register_custom_threshold_rule_type';

export function registerRuleTypes(
  alertingPlugin: PluginSetupContract,
  basePath: IBasePath,
  config: ObservabilityConfig,
  logger: Logger,
  ruleDataService: IRuleDataService,
  locators: CustomThresholdLocators
) {
  const ruleDataClientThreshold = ruleDataService.initializeIndex({
    feature: observabilityFeatureId,
    registrationContext: THRESHOLD_RULE_REGISTRATION_CONTEXT,
    dataset: Dataset.alerts,
    componentTemplateRefs: [],
    componentTemplates: [
      {
        name: 'mappings',
        mappings: mappingFromFieldMap({ ...legacyExperimentalFieldMap }, 'strict'),
      },
    ],
  });

  const createLifecycleRuleExecutorThreshold = createLifecycleExecutor(
    logger.get('rules'),
    ruleDataClientThreshold
  );

  alertingPlugin.registerType(
    thresholdRuleType(
      createLifecycleRuleExecutorThreshold,
      basePath,
      config,
      logger,
      ruleDataClientThreshold,
      locators
    )
  );
}
