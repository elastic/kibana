/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';
import { MatchingIndexesResp } from '../../common';

export async function getMatchingIndexes(
  indexPattern: string,
  { asCurrentUser }: IScopedClusterClient
): Promise<MatchingIndexesResp> {
  try {
    const { body: indexResults } = await asCurrentUser.cat.indices({
      index: indexPattern,
      format: 'JSON',
    });
    const matchingIndexes = indexResults
      .map((indexRecord) => indexRecord.index)
      .filter((indexName) => !!indexName);
    return {
      success: true,
      matchingIndexes: matchingIndexes as string[],
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}
