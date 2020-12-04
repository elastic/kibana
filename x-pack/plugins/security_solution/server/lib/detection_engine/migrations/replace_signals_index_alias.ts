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

export const replaceSignalsIndexAlias = async ({
  alias,
  esClient,
  newIndex,
  oldIndex,
}: {
  alias: string;
  esClient: ElasticsearchClient;
  newIndex: string;
  oldIndex: string;
}): Promise<void> => {
  await esClient.indices.updateAliases({
    body: {
      actions: [
        { remove: { index: oldIndex, alias } },
        { add: { index: newIndex, alias, is_write_index: false } },
      ],
    },
  });
};
