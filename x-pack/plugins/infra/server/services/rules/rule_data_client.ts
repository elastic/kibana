/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { CoreSetup, Logger } from 'src/core/server';
import { TECHNICAL_COMPONENT_TEMPLATE_NAME } from '../../../../rule_registry/common/assets';
import { RuleDataClient, RuleRegistryPluginSetupContract } from '../../../../rule_registry/server';
import { RuleConsumerNames, RulesServiceStartDeps } from './types';

export const createRuleDataClient = ({
  consumerName,
  getStartServices,
  logger,
  ruleDataService,
}: {
  consumerName: RuleConsumerNames;
  getStartServices: CoreSetup<RulesServiceStartDeps>['getStartServices'];
  logger: Logger;
  ruleDataService: RuleRegistryPluginSetupContract['ruleDataService'];
}) => {
  const ready = once(async () => {
    const componentTemplateName = ruleDataService.getFullAssetName(`${consumerName}-mappings`);

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

    await ruleDataService.createOrUpdateIndexTemplate({
      name: ruleDataService.getFullAssetName(consumerName),
      body: {
        index_patterns: [ruleDataService.getFullAssetName(`${consumerName}*`)],
        composed_of: [
          ruleDataService.getFullAssetName(TECHNICAL_COMPONENT_TEMPLATE_NAME),
          componentTemplateName,
        ],
      },
    });
  });

  ready().catch((err) => {
    logger!.error(err);
  });

  return new RuleDataClient({
    alias: ruleDataService.getFullAssetName(consumerName),
    getClusterClient: async () => {
      const [coreStart] = await getStartServices();
      return coreStart.elasticsearch.client.asInternalUser;
    },
    ready,
  });
};
