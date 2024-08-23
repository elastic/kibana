/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { Octokit } from 'octokit';
import type { ExternalRuleSourceSOAttributes } from './rule_repositories_type';
import { EXTERNAL_RULE_SOURCE_SO_TYPE } from './rule_repositories_type';
import type { ExternalRuleSourceOutput } from '../../../../../common/api/detection_engine/external_rule_sources/model/external_rule_source.gen';

interface ExternalRuleSourceClientDependencies {
  savedObjectsClient: SavedObjectsClientContract;
}

interface FindExternalRuleSourcesOptions {
  type?: string;
  page: number;
  perPage: number;
}

export interface ExternalRuleSourceClient {
  findExternalRuleSources: (
    option: FindExternalRuleSourcesOptions
  ) => Promise<{ results: ExternalRuleSourceOutput[]; total: number }>;
  getAuthenticatedGithubClient: (ruleSourceId: string) => Promise<Octokit>;
}

export const createExternalRuleSourcesClient = (
  dependencies: ExternalRuleSourceClientDependencies
): ExternalRuleSourceClient => {
  const savedObjectsClient = dependencies.savedObjectsClient;

  const findExternalRuleSources = async (options: FindExternalRuleSourcesOptions) => {
    const { page, perPage } = options;

    const finsResult = await savedObjectsClient.find<ExternalRuleSourceSOAttributes>({
      type: EXTERNAL_RULE_SOURCE_SO_TYPE,
      page,
      perPage,
      filter: options.type
        ? `${EXTERNAL_RULE_SOURCE_SO_TYPE}.attributes.${options.type}:*`
        : undefined,
    });

    const results = finsResult.saved_objects.map<ExternalRuleSourceOutput>((obj) => {
      const type = Object.keys(obj.attributes)[0] as keyof ExternalRuleSourceSOAttributes;
      return {
        id: obj.id,
        type,
        ...obj.attributes[type],
      };
    });

    return {
      results,
      total: finsResult.total,
    };
  };

  const clientsMap = new Map<string, Octokit>();

  const getAuthenticatedGithubClient = async (ruleSourceId: string) => {
    if (clientsMap.has(ruleSourceId)) {
      return clientsMap.get(ruleSourceId) as Octokit;
    }
    const ruleSource = await savedObjectsClient.get<ExternalRuleSourceSOAttributes>(
      EXTERNAL_RULE_SOURCE_SO_TYPE,
      ruleSourceId
    );

    if (ruleSource.error) {
      throw new Error(ruleSource.error.message);
    }

    const { token } = ruleSource.attributes.github;
    const client = new Octokit({ auth: token });
    clientsMap.set(ruleSourceId, client);

    return client;
  };

  return {
    findExternalRuleSources,
    getAuthenticatedGithubClient,
  };
};
