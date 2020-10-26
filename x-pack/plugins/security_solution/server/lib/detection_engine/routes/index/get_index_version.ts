/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { LegacyAPICaller } from '../../../../../../../../src/core/server';
import { readIndex } from '../../index/read_index';

interface IndicesAliasResponse {
  [index: string]: IndexAliasResponse;
}

interface IndexAliasResponse {
  aliases: {
    [aliasName: string]: Record<string, unknown>;
  };
}

export const getIndexVersion = async (
  callCluster: LegacyAPICaller,
  index: string
): Promise<number | undefined> => {
  const indexAlias: IndicesAliasResponse = await callCluster('indices.getAlias', {
    index,
  });
  const writeIndex = Object.keys(indexAlias).find(
    (key) => indexAlias[key].aliases[index].is_write_index
  );
  if (writeIndex === undefined) {
    return undefined;
  }
  const writeIndexMapping = await readIndex(callCluster, writeIndex);
  return get(writeIndexMapping, [writeIndex, 'mappings', '_meta', 'version']);
};
