/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';

interface AliasesResponse {
  [indexName: string]: {
    aliases: {
      [aliasName: string]: {
        is_write_index: boolean;
      };
    };
  };
}

interface Alias {
  name: string;
  isWriteIndex: boolean;
}

export const getSignalsIndexAliases = async ({
  esClient,
  index,
}: {
  esClient: ElasticsearchClient;
  index: string;
}): Promise<Alias[]> => {
  const response = await esClient.indices.getAlias<AliasesResponse>({
    index,
  });

  return Object.keys(response.body).map((indexName) => ({
    name: indexName,
    isWriteIndex: response.body[indexName].aliases[index]?.is_write_index === true,
  }));
};
