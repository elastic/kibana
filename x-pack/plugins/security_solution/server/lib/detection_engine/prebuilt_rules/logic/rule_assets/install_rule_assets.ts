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
import { fetchGithubRuleAssets } from './process_github_rule_assets';
import type { ExternalRuleAssetBlob } from '../../api/bootstrap_prebuilt_rules/bootstrap_prebuilt_rules';

export const installExternalPrebuiltRuleAssets = async (
  externalPrebuiltRuleBlobs: ExternalRuleAssetBlob[],
  savedObjectsClient: SavedObjectsClientContract,
  savedObjectsImporter: ISavedObjectsImporter,
  logger: Logger
) => {
  const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
  const latestPrebuiltRules = await ruleAssetsClient.fetchLatestAssets();

  const { assetsToInstall, errors } = await fetchGithubRuleAssets(
    latestPrebuiltRules,
    externalPrebuiltRuleBlobs
  );
  debugger;
  const result = await installKibanaSavedObjects({
    logger,
    savedObjectsImporter,
    kibanaAssets: assetsToInstall.map((rule) => ({
      id: `${rule.rule_id}_${rule.version}`,
      type: 'security-rule' as KibanaSavedObjectType,
      attributes: rule,
      references: [],
    })),
  });

  return result;
};
