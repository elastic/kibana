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
import { CustomThresholdLocators } from '@kbn/observability-plugin/server';
import { sloFeatureId } from '@kbn/observability-plugin/common';
import { SLO_RULE_REGISTRATION_CONTEXT } from '../../common/constants';
import { sloBurnRateRuleType } from './slo_burn_rate';
import { sloRuleFieldMap } from './slo_burn_rate/field_map';

export function registerBurnRateRule(
  alertingPlugin: PluginSetupContract,
  basePath: IBasePath,
  logger: Logger,
  ruleDataService: IRuleDataService,
  locators: CustomThresholdLocators // TODO move this somewhere else, or use only alertsLocator
) {
  // SLO RULE
  const ruleDataClientSLO = ruleDataService.initializeIndex({
    feature: sloFeatureId,
    registrationContext: SLO_RULE_REGISTRATION_CONTEXT,
    dataset: Dataset.alerts,
    componentTemplateRefs: [],
    componentTemplates: [
      {
        name: 'mappings',
        mappings: mappingFromFieldMap(
          { ...legacyExperimentalFieldMap, ...sloRuleFieldMap },
          'strict'
        ),
      },
    ],
  });

  const createLifecycleRuleExecutorSLO = createLifecycleExecutor(
    logger.get('rules'),
    ruleDataClientSLO
  );
  alertingPlugin.registerType(
    sloBurnRateRuleType(createLifecycleRuleExecutorSLO, basePath, locators.alertsLocator)
  );
}
