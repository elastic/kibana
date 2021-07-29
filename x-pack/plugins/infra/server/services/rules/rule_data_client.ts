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
import type { InfraFeatureId } from '../../../common/constants';
import { RuleRegistrationContext, RulesServiceStartDeps } from './types';

export const createRuleDataClient = ({
  ownerFeatureId,
  registrationContext,
  getStartServices,
  logger,
  ruleDataService,
}: {
  ownerFeatureId: InfraFeatureId;
  registrationContext: RuleRegistrationContext;
  getStartServices: CoreSetup<RulesServiceStartDeps>['getStartServices'];
  logger: Logger;
  ruleDataService: RuleRegistryPluginSetupContract['ruleDataService'];
}) => {
  const componentTemplateName = ruleDataService.getFullAssetName(
    `${registrationContext}-mappings`
  );
  const initializeRuleDataTemplates = once(async () => {
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
          mappings: {},
        },
      },
    });

    /*await ruleDataService.createOrUpdateIndexTemplate({
      name: ruleDataService.getFullAssetName(registrationContext),
      body: {
        index_patterns: [indexNamePattern],
        composed_of: [
          ruleDataService.getFullAssetName(TECHNICAL_COMPONENT_TEMPLATE_NAME),
          componentTemplateName,
        ],
      },
    });*/

    await ruleDataService.updateIndexMappingsForAsset(registrationContext);
  });

  // initialize eagerly
  const initializeRuleDataTemplatesPromise = initializeRuleDataTemplates().catch((err) => {
    logger.error(err);
  });

  return ruleDataService.getRuleDataClient(
    ownerFeatureId,
    registrationContext,
    () => initializeRuleDataTemplatesPromise,
    [
      ruleDataService.getFullAssetName(TECHNICAL_COMPONENT_TEMPLATE_NAME),
      componentTemplateName,
    ]
  );
};
