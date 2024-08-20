/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Octokit } from 'octokit';
import type { RuleResponse } from '../../../../../../common/api/detection_engine';
import { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';

interface CommitRulesArgs {
  repository: {
    repository: string;
    username: string;
    token: string;
  };
  rules: RuleResponse[];
}

export const commitRulesToRepository = async (args: CommitRulesArgs) => {
  const { repository, rules } = args;
  const octoKitClient = new Octokit({
    auth: repository.token,
  });
  const owner = repository.username;
  const repo = repository.repository;

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
      const prebuiltRuleAsset = PrebuiltRuleAsset.parse(rule);
      // TODO increment rule version and write it to DB before committing; Newly created rules have version 1, do not increment version in this case
      const blobData = await octoKitClient.rest.git.createBlob({
        owner,
        repo,
        content: JSON.stringify(prebuiltRuleAsset),
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
