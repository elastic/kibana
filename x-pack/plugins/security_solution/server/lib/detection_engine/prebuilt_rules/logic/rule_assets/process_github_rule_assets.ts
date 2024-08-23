/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleVersionSpecifier } from '../../../../../../common/api/detection_engine';
import type { ExternalRuleAssetBlob } from '../../api/bootstrap_prebuilt_rules/bootstrap_prebuilt_rules';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import { validatePrebuiltRuleAsset } from './prebuilt_rule_assets_validation';
import type { ExternalRuleSourceClient } from '../../../external_rule_sources/logic/external_rule_sources_client';

export const fetchGithubRuleAssets = async (
  installedAssetsVersionSpecifiers: RuleVersionSpecifier[],
  externalPrebuiltRuleBlobs: ExternalRuleAssetBlob[],
  externalRuleSourceClient: ExternalRuleSourceClient
) => {
  const ruleBlobsToInstall: ExternalRuleAssetBlob[] = [];
  const installedRuleAssetsMap = new Map(
    installedAssetsVersionSpecifiers.map((rule) => [`${rule.rule_id}_${rule.version}`, rule])
  );

  for (const blob of externalPrebuiltRuleBlobs) {
    const { filename, repository } = blob;
    const [ruleId, versionFromFilename] = filename.split('_');

    const version = parseInt(versionFromFilename, 10);

    const fullRuleId = `${repository.id}_${ruleId}_${versionFromFilename}`;

    const installedRule = installedRuleAssetsMap.get(fullRuleId);

    if (!installedRule || version > installedRule.version) {
      ruleBlobsToInstall.push(blob);
    }
  }

  return fetchRuleAssetsToInstall(ruleBlobsToInstall, externalRuleSourceClient);
};

const fetchRuleAssetsToInstall = async (
  ruleBlobsToInstall: ExternalRuleAssetBlob[],
  externalRuleSourceClient: ExternalRuleSourceClient
) => {
  const batchSize = 50;
  const assetsToInstall: PrebuiltRuleAsset[] = [];
  const errors: Array<{ filename?: string; error: string }> = [];

  for (let i = 0; i < ruleBlobsToInstall.length; i += batchSize) {
    const batch = ruleBlobsToInstall.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((blob) => fetchSingleRuleAsset(blob, externalRuleSourceClient))
    );

    batchResults.forEach((result) => {
      if (result.success) {
        assetsToInstall.push(result.asset);
      } else {
        errors.push({ filename: result.filename, error: result.error });
      }
    });
  }

  return { assetsToInstall, errors };
};

type FetchResult =
  | { success: true; asset: PrebuiltRuleAsset; repository_id: string }
  | { success: false; error: string; repository_id: string; filename?: string };

const fetchSingleRuleAsset = async (
  blob: ExternalRuleAssetBlob,
  externalRuleSourceClient: ExternalRuleSourceClient
): Promise<FetchResult> => {
  const repositoryId = `${blob.repository.id}`;

  if (!blob.sha) {
    return {
      success: false,
      error: `No SHA found for ${blob.filename}`,
      repository_id: repositoryId,
    };
  }

  try {
    const octokit = await externalRuleSourceClient.getAuthenticatedGithubClient(repositoryId);
    const response = await octokit.request('GET /repos/{owner}/{repo}/git/blobs/{file_sha}', {
      owner: blob.repository.owner,
      repo: blob.repository.repo,
      file_sha: blob.sha,
      headers: { 'X-GitHub-Api-Version': '2022-11-28' },
    });

    const decodedContent = Buffer.from(response.data.content, 'base64').toString('utf-8');
    const rawAsset = JSON.parse(decodedContent);
    if (`${rawAsset.rule_id}_${rawAsset.version}` !== `${repositoryId}_${blob.filename}`) {
      return {
        success: false,
        error: `The rule_id in the asset does not match the rule_id codified in the filename. rule_id: ${rawAsset.rule_id}, filename: ${blob.filename}`,
        repository_id: repositoryId,
        filename: blob.filename,
      };
    }

    const rawAssetWithRepositoryId = {
      ...rawAsset,
      // rule_id: `${repositoryId}_${rawAsset.rule_id}`, // append repositoryId before saving rule_id
      repository_id: repositoryId,
    };

    const asset = validatePrebuiltRuleAsset(rawAssetWithRepositoryId);

    return { success: true, asset, repository_id: repositoryId };
  } catch (error) {
    return {
      success: false,
      filename: blob.filename,
      error: error.message,
      repository_id: repositoryId,
    };
  }
};
