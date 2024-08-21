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
import type {
  ExternalRuleAssetBlob,
  PrebuiltRuleRepository,
} from '../../api/bootstrap_prebuilt_rules/bootstrap_prebuilt_rules';

type RepositoryId = string;
type RuleIds = string[];
interface UpdatedRepository {
  repositoryId: RepositoryId;
  ruleIds: RuleIds;
}
export interface InstallationResult {
  updated: UpdatedRepository[];
  errors: Array<{ filename?: string; error: string }>;
}

export const installExternalPrebuiltRuleAssets = async (
  prebuiltRuleRepositories: PrebuiltRuleRepository[],
  externalPrebuiltRuleBlobs: ExternalRuleAssetBlob[],
  savedObjectsClient: SavedObjectsClientContract,
  savedObjectsImporter: ISavedObjectsImporter,
  logger: Logger
): Promise<InstallationResult> => {
  if (!prebuiltRuleRepositories) {
    return {
      updated: [],
      errors: [],
    };
  }
  const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
  const installedAssetsVersionSpecifiers = await ruleAssetsClient.fetchAllAssetsVersionInfo();

  const { assetsToInstall, errors } = await fetchGithubRuleAssets(
    installedAssetsVersionSpecifiers,
    externalPrebuiltRuleBlobs
  );

  const installationResults = await installKibanaSavedObjects({
    logger,
    savedObjectsImporter,
    kibanaAssets: assetsToInstall.map((rule) => ({
      id: `${rule.rule_id}_${rule.version}`,
      type: 'security-rule' as KibanaSavedObjectType,
      attributes: rule,
      references: [],
    })),
  });
  const installedRulesAssetIds = new Set(installationResults.map((result) => result.id));

  // Filter out rules that haven't been properly installed and create a list of
  // which rules have been installed from each repository
  const updated = Array.from<[RepositoryId, RuleIds]>(
    assetsToInstall
      .filter(({ rule_id: ruleId, version }) => installedRulesAssetIds.has(`${ruleId}_${version}`))
      .reduce((acc, { external_source: externalSource, rule_id: ruleId }) => {
        if (externalSource) {
          acc.set(externalSource, (acc.get(externalSource) || []).concat(ruleId));
        }
        return acc;
      }, new Map())
  ).map(([repositoryId, ruleIds]) => ({ repositoryId, ruleIds }));

  return {
    updated,
    errors,
  };
};
