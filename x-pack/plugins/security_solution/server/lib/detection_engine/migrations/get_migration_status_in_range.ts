/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';
import { getMigrationStatus } from './get_migration_status';
import { getSignalsIndexAliases } from './get_signals_index_aliases';
import { getSignalsIndicesInRange } from './get_signals_indices_in_range';
import { MigrationStatus } from './types';

export const getMigrationStatusInRange = async ({
  esClient,
  from,
  index,
}: {
  esClient: ElasticsearchClient;
  index: string;
  from: string;
}): Promise<MigrationStatus[]> => {
  const signalsAliases = await getSignalsIndexAliases({ esClient, index });
  const nonWriteIndices = signalsAliases
    .filter((alias) => !alias.isWriteIndex)
    .map((alias) => alias.name);
  const indicesInRange = await getSignalsIndicesInRange({
    esClient,
    index: nonWriteIndices,
    from,
  });

  return getMigrationStatus({ esClient, index: indicesInRange });
};
