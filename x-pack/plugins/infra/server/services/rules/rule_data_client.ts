/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { CoreSetup, Logger } from 'src/core/server';
import { TECHNICAL_COMPONENT_TEMPLATE_NAME } from '../../../../rule_registry/common/assets';
import { RuleRegistryPluginSetupContract } from '../../../../rule_registry/server';
import { logThresholdRuleDataNamespace } from '../../../common/alerting/logs/log_threshold';
import { RuleRegistrationContext, RulesServiceStartDeps } from './types';

export const createRuleDataClient = ({
  registrationContext,
  getStartServices,
  logger,
  ruleDataService,
}: {
  registrationContext: RuleRegistrationContext;
  getStartServices: CoreSetup<RulesServiceStartDeps>['getStartServices'];
  logger: Logger;
  ruleDataService: RuleRegistryPluginSetupContract['ruleDataService'];
}) => {
  const initializeRuleDataTemplates = once(async () => {
    const componentTemplateName = ruleDataService.getFullAssetName(
      `${registrationContext}-mappings`
    );

    if (!ruleDataService.isWriteEnabled()) {
      return;
    }

    await ruleDataService.createOrUpdateComponentTemplate({
      name: componentTemplateName,
      body: {
        template: {
          settings: {
            number_of_shards: 1,
          },
          mappings: {
            properties: {
              [logThresholdRuleDataNamespace]: {
                type: 'flattened',
                index: false,
              },
            },
          },
        },
      },
    });

    await ruleDataService.createOrUpdateIndexTemplate({
      name: ruleDataService.getFullAssetName(registrationContext),
      body: {
        index_patterns: [ruleDataService.getFullAssetName(`${registrationContext}*`)],
        composed_of: [
          ruleDataService.getFullAssetName(TECHNICAL_COMPONENT_TEMPLATE_NAME),
          componentTemplateName,
        ],
      },
    });
  });

  // initialize eagerly
  const initializeRuleDataTemplatesPromise = initializeRuleDataTemplates().catch((err) => {
    logger.error(err);
  });

  return ruleDataService.getRuleDataClient(
    ruleDataService.getFullAssetName(registrationContext),
    () => initializeRuleDataTemplatesPromise
  );
};
