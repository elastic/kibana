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
import type { RuleSource, RuleVersion } from '../../../../../../common/api/detection_engine';
import { createPrebuiltRuleAssetsClient } from './prebuilt_rule_assets_client';
import { fetchGithubRuleAssets } from './process_github_rule_assets';
import type {
  ExternalRuleAssetBlob,
  PrebuiltRuleRepository,
} from '../../api/bootstrap_prebuilt_rules/bootstrap_prebuilt_rules';
import type { IDetectionRulesClient } from '../../../rule_management/logic/detection_rules_client/detection_rules_client_interface';
import type { IPrebuiltRuleObjectsClient } from '../rule_objects/prebuilt_rule_objects_client';

type RuleId = string;
type RepositoryId = string;
interface RuleSpecifiers {
  rule_id: string;
  version: number;
}
interface UpdatedRepository {
  repositoryId: RepositoryId;
  ruleSpecifiers: RuleSpecifiers[];
}
export interface InstallationResult {
  updated: UpdatedRepository[];
  errors: Array<{ filename?: string; error: string }>;
}

interface InstallExternalPrebuiltRuleAssetsArgs {
  prebuiltRuleRepositories: PrebuiltRuleRepository[];
  externalPrebuiltRuleBlobs: ExternalRuleAssetBlob[];
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectsImporter: ISavedObjectsImporter;
  detectionRulesClient: IDetectionRulesClient;
  ruleObjectsClient: IPrebuiltRuleObjectsClient;
  logger: Logger;
}

export const installExternalPrebuiltRuleAssets = async ({
  prebuiltRuleRepositories,
  externalPrebuiltRuleBlobs,
  savedObjectsClient,
  savedObjectsImporter,
  detectionRulesClient,
  ruleObjectsClient,
  logger,
}: InstallExternalPrebuiltRuleAssetsArgs): Promise<InstallationResult> => {
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
  const updated: UpdatedRepository[] = Array.from<[RepositoryId, RuleSpecifiers[]]>(
    assetsToInstall
      .filter(({ rule_id: ruleId, version }) => installedRulesAssetIds.has(`${ruleId}_${version}`))
      .reduce((acc, { repository_id: repositoryId, rule_id: ruleId, version }) => {
        if (repositoryId) {
          acc.set(repositoryId, (acc.get(repositoryId) || []).concat({ rule_id: ruleId, version }));
        }
        return acc;
      }, new Map())
  ).map(([repositoryId, ruleSpecifiers]) => ({ repositoryId, ruleSpecifiers }));

  // From a list of `{repoId}_{rule_id}_{version}`, get a list of the latest version installed
  // for each `{repoId}_{rule_id}` combination.
  const latestAssetSpecifiers = getLatestRuleAssetSpecifiers(installedRulesAssetIds);

  // Update rulew which
  await updateInstalledRulesToNonCustomized({
    latestAssetSpecifiers,
    detectionRulesClient,
    ruleObjectsClient,
  });

  return {
    updated,
    errors,
  };
};

const updateInstalledRulesToNonCustomized = async ({
  latestAssetSpecifiers,
  detectionRulesClient,
  ruleObjectsClient,
}: {
  latestAssetSpecifiers: Map<RuleId, RuleVersion>;
  detectionRulesClient: IDetectionRulesClient;
  ruleObjectsClient: IPrebuiltRuleObjectsClient;
}) => {
  const ruleIds = Array.from(latestAssetSpecifiers.keys());
  if (ruleIds.length === 0) {
    return;
  }

  // Get currently installed rules which had a new corresponding asset installed
  const installedRules = await ruleObjectsClient.fetchInstalledRulesByIds(ruleIds);

  for (const rule of installedRules) {
    const { rule_source: ruleSource, version } = rule;

    const latestAssetVersion = latestAssetSpecifiers.get(rule.rule_id);

    if (isCustomizedExternalRule(ruleSource) && version === latestAssetVersion) {
      await detectionRulesClient.updateRule({ ruleUpdate: rule });
    }
  }
};

function isCustomizedExternalRule(
  ruleSource: RuleSource | undefined
): ruleSource is { type: 'external'; is_customized: true } {
  return !!ruleSource && ruleSource.type === 'external' && ruleSource.is_customized;
}

function getLatestRuleAssetSpecifiers(ruleSet: Set<string>): Map<RuleId, RuleVersion> {
  const ruleMap = new Map<RuleId, RuleVersion>();

  // Process each rule string in the set
  ruleSet.forEach((ruleString) => {
    const lastUnderscoreIndex = ruleString.lastIndexOf('_');
    if (lastUnderscoreIndex === -1) return; // Skip invalid entries

    const repoIdAndRuleId = ruleString.slice(0, lastUnderscoreIndex);
    const version = parseInt(ruleString.slice(lastUnderscoreIndex + 1), 10);

    const currentVersion = ruleMap.get(repoIdAndRuleId);
    if (currentVersion === undefined || version > currentVersion) {
      ruleMap.set(repoIdAndRuleId, version);
    }
  });

  return ruleMap;
}
