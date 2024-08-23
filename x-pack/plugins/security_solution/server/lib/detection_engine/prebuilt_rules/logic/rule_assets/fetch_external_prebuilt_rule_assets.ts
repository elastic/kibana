/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsImporter, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ExternalRuleSourceOutput } from '../../../../../../common/api/detection_engine/external_rule_sources/model/external_rule_source.gen';
import { installExternalPrebuiltRuleAssets } from './install_rule_assets';
import type { IDetectionRulesClient } from '../../../rule_management/logic/detection_rules_client/detection_rules_client_interface';
import type { IPrebuiltRuleObjectsClient } from '../rule_objects/prebuilt_rule_objects_client';
import type { ExternalRuleSourceClient } from '../../../external_rule_sources/logic/external_rule_sources_client';

export interface ExternalRuleAssetBlob {
  filename: string;
  sha?: string;
  repository: ExternalRuleSourceOutput;
}

interface GetExternalPrebuiltRuleAssetsArgs {
  externalRuleSourceClient: ExternalRuleSourceClient;
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectsImporter: ISavedObjectsImporter;
  detectionRulesClient: IDetectionRulesClient;
  ruleObjectsClient: IPrebuiltRuleObjectsClient;
  logger: Logger;
}

export const getExternalPrebuiltRuleAssets = async ({
  externalRuleSourceClient,
  savedObjectsClient,
  savedObjectsImporter,
  detectionRulesClient,
  ruleObjectsClient,
  logger,
}: GetExternalPrebuiltRuleAssetsArgs) => {
  const prebuiltRuleRepositories = await externalRuleSourceClient.findExternalRuleSources({
    type: 'github',
    page: 1,
    perPage: 10000,
  });
  const externalPrebuiltRuleBlobs = await fetchPrebuiltRuleFilenames(
    prebuiltRuleRepositories.results,
    externalRuleSourceClient
  );

  const installResult = await installExternalPrebuiltRuleAssets({
    externalPrebuiltRuleBlobs,
    savedObjectsClient,
    savedObjectsImporter,
    detectionRulesClient,
    ruleObjectsClient,
    logger,
    externalRuleSourceClient,
  });

  return installResult;
};

async function fetchPrebuiltRuleFilenames(
  prebuiltRuleRepositories: ExternalRuleSourceOutput[],
  externalRuleSourceClient: ExternalRuleSourceClient
): Promise<ExternalRuleAssetBlob[]> {
  const allRules: ExternalRuleAssetBlob[] = [];

  for (const repository of prebuiltRuleRepositories) {
    const octokit = await externalRuleSourceClient.getAuthenticatedGithubClient(repository.id);
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}', {
      owner: repository.owner,
      repo: repository.repo,
      tree_sha: 'main',
      recursive: 'true',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    const files = data.tree
      .filter((item) => item.type === 'blob')
      .filter((item) => item.path && item.path.endsWith('.json'))
      .map((item) => ({
        filename: item.path?.replace('.json', '') ?? '',
        sha: item.sha,
        repository,
      }));

    allRules.push(...files);
  }

  return allRules;
}
