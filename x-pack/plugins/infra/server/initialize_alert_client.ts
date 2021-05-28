/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { CoreSetup, Logger } from 'src/core/server';
import { InfraServerPluginSetupDeps } from './lib/adapters/framework';
import { RuleDataClient } from '../../rule_registry/server';
import { TECHNICAL_COMPONENT_TEMPLATE_NAME } from '../../rule_registry/common/assets';

// This is an initial Logs/Metrics POC, using an APM example seen here:
// https://github.com/elastic/kibana/blob/7fd6539dcaa0aa4119abd2ee4f0462fd57de16d4/x-pack/plugins/apm/server/plugin.ts#L137-L196

// Uptime implementation in progress here:
// https://github.com/elastic/kibana/pull/100699

// Rule Registry (Rule Data) plugin found here:
// https://github.com/elastic/kibana/blob/bdde884d098f42a93630cc6d221258bdc3372e60/x-pack/plugins/rule_registry/README.md

// Note: if we get this sorted here, I think this kind of "initialize client" helper should
// move into the rule_registry plugin so that the simple use case is much easier

export function initializeAlertClient({
  name,
  plugins,
  logger,
  getStartServices,
}: {
  name: string;
  plugins: InfraServerPluginSetupDeps;
  logger: Logger;
  getStartServices: CoreSetup['getStartServices'];
}) {
  const { ruleDataService } = plugins.ruleRegistry;

  const ready = once(async () => {
    const componentTemplateName = ruleDataService.getFullAssetName(`${name}-mappings`);

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
      name: ruleDataService.getFullAssetName(`${name}-index-template`),
      body: {
        index_patterns: [ruleDataService.getFullAssetName(`observability-${name}*`)],
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
    alias: ruleDataService.getFullAssetName('observability-apm'),
    getClusterClient: async () => {
      const [coreStart] = await getStartServices();
      return coreStart.elasticsearch.client.asInternalUser;
    },
    ready,
  });
}
