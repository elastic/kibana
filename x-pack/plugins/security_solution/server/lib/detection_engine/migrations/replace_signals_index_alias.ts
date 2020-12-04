/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';

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
