/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../../../../common/api/detection_engine';
import type { GithubRuleSourceOutput } from '../../../../../../common/api/detection_engine/external_rule_sources/model/external_rule_source.gen';
import type { ExternalRuleSourceClient } from '../../../external_rule_sources/logic/external_rule_sources_client';
import type { IDetectionRulesClient } from '../../../rule_management/logic/detection_rules_client/detection_rules_client_interface';
import { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';

interface CommitRulesArgs {
  repository: GithubRuleSourceOutput;
  rules: RuleResponse[];
  detectionRulesClient: IDetectionRulesClient;
  externalRuleSourceClient: ExternalRuleSourceClient;
}

export const commitRulesToRepository = async (args: CommitRulesArgs) => {
  const { repository, rules, detectionRulesClient, externalRuleSourceClient } = args;
  const octoKitClient = await externalRuleSourceClient.getAuthenticatedGithubClient(repository.id);
  const { owner, repo } = repository;

  // Get the main branch commit sha
  const { data: refData } = await octoKitClient.rest.git.getRef({
    owner,
    repo,
    ref: `heads/main`,
  });
  const latestCommitSha = refData.object.sha;
  const { data: commitData } = await octoKitClient.rest.git.getCommit({
    owner,
    repo,
    commit_sha: latestCommitSha,
  });
  const treeSha = commitData.tree.sha;

  const ruleBlobs = await Promise.all(
    rules.map(async (rule) => {
      // Increment the rule version before publishing so it will be added as a new file
      const updatedRule = await detectionRulesClient.updateRule({
        ruleUpdate: {
          ...rule,
          version: rule.version + 1,
        },
      });
      const prebuiltRuleAsset = {
        ...PrebuiltRuleAsset.parse(updatedRule),
        repository_id: repository.id,
      };
      const blobData = await octoKitClient.rest.git.createBlob({
        owner,
        repo,
        content: JSON.stringify(prebuiltRuleAsset, null, 2),
        encoding: 'utf-8',
      });
      return {
        sha: blobData.data.sha,
        path: `${prebuiltRuleAsset.rule_id}_${prebuiltRuleAsset.version}.json`,
      };
    })
  );
  const { data: newTree } = await octoKitClient.rest.git.createTree({
    owner,
    repo,
    tree: ruleBlobs.map(({ sha, path }) => ({
      path,
      mode: `100644`,
      type: `blob`,
      sha,
    })),
    base_tree: treeSha,
  });

  // create a new commit with the new rules
  const { data: newCommit } = await octoKitClient.rest.git.createCommit({
    owner,
    repo,
    message: 'Add prebuilt rules',
    tree: newTree.sha,
    parents: [latestCommitSha],
  });

  // update the main branch to point to the new commit
  await octoKitClient.rest.git.updateRef({
    owner,
    repo,
    ref: `heads/main`,
    sha: newCommit.sha,
  });
};
