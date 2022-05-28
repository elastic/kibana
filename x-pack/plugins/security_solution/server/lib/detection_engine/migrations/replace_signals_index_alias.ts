/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

/**
 * Updates aliases for the old and new concrete indexes specified, respectively
 * removing and adding them atomically.
 *
 * This is invoked as part of the finalization of a signals migration: once the
 * migrated index has been verified, its alias replaces the outdated index.
 *
 * @param esClient An {@link ElasticsearchClient}
 * @param alias name of the signals alias
 * @param newIndex name of the concrete signals index to be aliased
 * @param oldIndex name of the concrete signals index to be unaliased
 *
 * @throws if elasticsearch returns an error
 */
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
  // TODO: space-aware?
  await esClient.indices.updateAliases({
    body: {
      actions: [
        { remove: { index: oldIndex, alias: '.siem-signals-default' } },
        { add: { index: newIndex, alias: '.siem-signals-default', is_write_index: false } },
      ],
    },
  });
};
