/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { ElasticsearchClient } from '../../../../../../../../src/core/server';
import { readIndex } from '../../index/read_index';

export const getIndexVersion = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<number> => {
  const { body: indexAlias } = await esClient.indices.getAlias({
    index,
  });
  const writeIndex = Object.keys(indexAlias).find(
    (key) => indexAlias[key].aliases[index]?.is_write_index
  );
  if (writeIndex === undefined) {
    return 0;
  }
  const writeIndexMapping = await readIndex(esClient, writeIndex);
  return get(writeIndexMapping, ['body', writeIndex, 'mappings', '_meta', 'version']) ?? 0;
};
