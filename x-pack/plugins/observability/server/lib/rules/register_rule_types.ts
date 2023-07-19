/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetupContract } from '@kbn/alerting-plugin/server';
import { IBasePath, Logger } from '@kbn/core/server';
import { LocatorPublic } from '@kbn/share-plugin/common';
import {
  createLifecycleExecutor,
  Dataset,
  IRuleDataService,
} from '@kbn/rule-registry-plugin/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import { sloFeatureId, AlertsLocatorParams, observabilityFeatureId } from '../../../common';
import { ObservabilityConfig } from '../..';
import {
  SLO_RULE_REGISTRATION_CONTEXT,
  THRESHOLD_RULE_REGISTRATION_CONTEXT,
} from '../../common/constants';
import { sloBurnRateRuleType } from './slo_burn_rate';
import { thresholdRuleType } from './threshold/register_threshold_rule_type';
import { sloRuleFieldMap } from './slo_burn_rate/field_map';

export function registerRuleTypes(
  alertingPlugin: PluginSetupContract,
  logger: Logger,
  ruleDataService: IRuleDataService,
  basePath: IBasePath,
  config: ObservabilityConfig,
  alertsLocator?: LocatorPublic<AlertsLocatorParams>
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
    sloBurnRateRuleType(createLifecycleRuleExecutorSLO, basePath, alertsLocator)
  );

  // Threshold RULE
  if (config.unsafe.thresholdRule.enabled) {
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
        alertsLocator
      )
    );
  }
}
