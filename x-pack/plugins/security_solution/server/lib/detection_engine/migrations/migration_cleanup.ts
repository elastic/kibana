/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';
import migrationCleanupPolicy from './migration_cleanup_policy.json';

export const getMigrationCleanupPolicyName = (index: string): string =>
  `${index}-migration-cleanup`;

const getPolicyExists = async ({
  esClient,
  policy,
}: {
  esClient: ElasticsearchClient;
  policy: string;
}): Promise<boolean> => {
  try {
    await esClient.ilm.getLifecycle({
      policy,
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

export const ensureMigrationCleanupPolicy = async ({
  esClient,
  index,
}: {
  esClient: ElasticsearchClient;
  index: string;
}): Promise<void> => {
  const policy = getMigrationCleanupPolicyName(index);

  const policyExists = await getPolicyExists({ esClient, policy });
  if (!policyExists) {
    await esClient.ilm.putLifecycle({
      policy,
      body: migrationCleanupPolicy,
    });
  }
};
