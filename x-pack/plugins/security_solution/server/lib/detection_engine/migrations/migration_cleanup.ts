/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'src/core/server';
import migrationCleanupPolicy from './migration_cleanup_policy.json';

export const getMigrationCleanupPolicyName = (alias: string): string =>
  `${alias}-migration-cleanup`;

const getPolicyExists = async ({
  esClient,
  policy,
}: {
  esClient: ElasticsearchClient;
  policy: string;
}): Promise<boolean> => {
  try {
    await esClient.ilm.getLifecycle({
      name: policy,
    });
    return true;
  } catch (err) {
    if (err.statusCode === 404) {
      return false;
    } else {
      throw err;
    }
  }
};

/**
 * Checks that the migration cleanup ILM policy exists for the given signals
 * alias, and creates it if necessary.
 *
 * This policy is applied to outdated signals indexes post-migration, ensuring
 * that they are eventually deleted.
 *
 * @param esClient An {@link ElasticsearchClient}
 * @param alias name of the signals alias
 *
 * @throws if elasticsearch returns an error
 */
export const ensureMigrationCleanupPolicy = async ({
  esClient,
  alias,
}: {
  esClient: ElasticsearchClient;
  alias: string;
}): Promise<void> => {
  const policy = getMigrationCleanupPolicyName(alias);

  const policyExists = await getPolicyExists({ esClient, policy });
  if (!policyExists) {
    await esClient.ilm.putLifecycle({
      name: policy,
      body: migrationCleanupPolicy,
    });
  }
};

/**
 * Applies the migration cleanup ILM policy to the specified signals index.
 *
 * This is invoked for an outdated signals index after a successful index
 * migration, ensuring that it's eventually deleted.
 *
 * @param esClient An {@link ElasticsearchClient}
 * @param alias name of the signals alias
 * @param index name of the concrete signals index to receive the policy
 *
 * @throws if elasticsearch returns an error
 */
export const applyMigrationCleanupPolicy = async ({
  alias,
  esClient,
  index,
}: {
  alias: string;
  esClient: ElasticsearchClient;
  index: string;
}): Promise<void> => {
  await esClient.indices.putSettings({
    index,
    body: {
      lifecycle: {
        name: getMigrationCleanupPolicyName(alias),
      },
    },
  });
};
