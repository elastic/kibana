/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { installKibanaSavedObjects } from '@kbn/fleet-plugin/server/services/epm/kibana/assets/install';
import type { ISavedObjectsImporter } from '@kbn/core-saved-objects-server';
import type { KibanaSavedObjectType } from '@kbn/fleet-plugin/common';
import { createPrebuiltRuleAssetsClient } from './prebuilt_rule_assets_client';
import { readPrebuiltRulesFromFolder } from './read_prebuilt_rules_from_dir';
import { processLocalRuleAssets } from './process_local_rule_assets';

export const installLocalPrebuiltRuleAssets = async (
  savedObjectsClient: SavedObjectsClientContract,
  savedObjectsImporter: ISavedObjectsImporter,
  logger: Logger
) => {
  const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
  const latestPrebuiltRules = await ruleAssetsClient.fetchLatestAssets();

  const localPrebuiltRules = await readPrebuiltRulesFromFolder();

  const { rulesToInstall, rulesToUpgrade } = processLocalRuleAssets(
    latestPrebuiltRules,
    localPrebuiltRules
  );

  const result = await installKibanaSavedObjects({
    logger,
    savedObjectsImporter,
    kibanaAssets: [...rulesToInstall, ...rulesToUpgrade].map((rule) => ({
      id: rule.rule_id,
      type: 'security-rule' as KibanaSavedObjectType,
      attributes: rule,
      references: [],
    })),
  });
  debugger;
  return result;

  // TODO: create a method for creating security-rule assets in the kibana_security_solution index

  // const result = await createPrebuiltRules(detectionRulesClient, rulesToInstall);
  // const { results: updatedRules, errors: installationErrors } = await upgradePrebuiltRules(
  //   detectionRulesClient,
  //   rulesToUpgrade
  // );

  // debugger;
};
