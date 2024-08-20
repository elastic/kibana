/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Octokit } from '@octokit/rest';
import type { ExternalRuleAssetBlob } from '../../api/bootstrap_prebuilt_rules/bootstrap_prebuilt_rules';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import { validatePrebuiltRuleAsset } from './prebuilt_rule_assets_validation';

export const fetchGithubRuleAssets = async (
  installedRuleAssets: PrebuiltRuleAsset[],
  externalPrebuiltRuleBlobs: ExternalRuleAssetBlob[]
) => {
  const ruleBlobsToInstall: ExternalRuleAssetBlob[] = [];
  const installedRuleMap = new Map(installedRuleAssets.map((rule) => [rule.rule_id, rule]));

  for (const blob of externalPrebuiltRuleBlobs) {
    const [ruleId, versionFromFilename] = blob.filename.split('_');

    const version = parseInt(versionFromFilename, 10);

    const installedRule = installedRuleMap.get(ruleId);

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
  | { success: true; asset: PrebuiltRuleAsset }
  | { success: false; error: string; filename?: string };

const fetchSingleRuleAsset = async (blob: ExternalRuleAssetBlob): Promise<FetchResult> => {
  if (!blob.sha) {
    return { success: false, error: `No SHA found for ${blob.filename}` };
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
    const rawAssetWithExternalSource = {
      ...rawAsset,
      external_source: `${blob.repository.username}/${blob.repository.repository}`,
    };
    const asset = validatePrebuiltRuleAsset(rawAssetWithExternalSource);
    return { success: true, asset };
  } catch (error) {
    return { success: false, filename: blob.filename, error: error.message };
  }
};
