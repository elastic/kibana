/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Octokit } from 'octokit';
import type { RuleVersionSpecifier } from '../../../../../../common/api/detection_engine';
import type { ExternalRuleAssetBlob } from '../../api/bootstrap_prebuilt_rules/bootstrap_prebuilt_rules';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import { validatePrebuiltRuleAsset } from './prebuilt_rule_assets_validation';

export const fetchGithubRuleAssets = async (
  installedAssetsVersionSpecifiers: RuleVersionSpecifier[],
  externalPrebuiltRuleBlobs: ExternalRuleAssetBlob[]
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

  return fetchRuleAssetsToInstall(ruleBlobsToInstall);
};

const fetchRuleAssetsToInstall = async (ruleBlobsToInstall: ExternalRuleAssetBlob[]) => {
  const batchSize = 50;
  const assetsToInstall: PrebuiltRuleAsset[] = [];
  const errors: Array<{ filename?: string; error: string }> = [];

  for (let i = 0; i < ruleBlobsToInstall.length; i += batchSize) {
    const batch = ruleBlobsToInstall.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fetchSingleRuleAsset));

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
  | { success: true; asset: PrebuiltRuleAsset; external_source: string }
  | { success: false; error: string; external_source: string; filename?: string };

const fetchSingleRuleAsset = async (blob: ExternalRuleAssetBlob): Promise<FetchResult> => {
  const externalSource = `${blob.repository.id}`;

  if (!blob.sha) {
    return {
      success: false,
      error: `No SHA found for ${blob.filename}`,
      external_source: externalSource,
    };
  }

  const octokit = new Octokit({ auth: blob.repository.token });

  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/git/blobs/{file_sha}', {
      owner: blob.repository.username,
      repo: blob.repository.repository,
      file_sha: blob.sha,
      headers: { 'X-GitHub-Api-Version': '2022-11-28' },
    });

    const decodedContent = Buffer.from(response.data.content, 'base64').toString('utf-8');
    const rawAsset = JSON.parse(decodedContent);

    if (rawAsset.rule_id !== blob.filename.split('_')[0]) {
      return {
        success: false,
        error: `The rule_id in the file does not match the rule_id codified in the filename. rule_id: ${rawAsset.rule_id}, filename: ${blob.filename}`,
        external_source: externalSource,
        filename: blob.filename,
      };
    }

    const rawAssetWithExternalSource = {
      ...rawAsset,
      rule_id: `${externalSource}_${rawAsset.rule_id}`, // append repositoryId before saving rule_id
      external_source: externalSource,
    };

    const asset = validatePrebuiltRuleAsset(rawAssetWithExternalSource);

    return { success: true, asset, external_source: externalSource };
  } catch (error) {
    return {
      success: false,
      filename: blob.filename,
      error: error.message,
      external_source: externalSource,
    };
  }
};
