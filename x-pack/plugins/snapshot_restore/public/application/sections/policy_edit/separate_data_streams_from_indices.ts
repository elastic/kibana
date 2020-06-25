/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyIndicesResponse } from '../../../../common/types';
import { indicesToArray } from '../../../../common/lib';

interface Result {
  dataStreams: string[];
  indices: string[];
}

/**
 * This function is used temporarily until we have a resolution to
 * https://github.com/elastic/elasticsearch/issues/58474 from ES side.
 */
export const separateDataStreamsFromIndices = (
  { dataStreams, indices }: PolicyIndicesResponse,
  configuredPatterns: string[] | string | undefined
): Result => {
  const configuredPatternsArray = indicesToArray(configuredPatterns);
  const result: Result = {
    dataStreams: [],
    indices: [],
  };
  for (const indexOrDataStreamPattern of configuredPatternsArray) {
    if (dataStreams.some((ds) => ds === indexOrDataStreamPattern)) {
      result.dataStreams.push(indexOrDataStreamPattern);
    } else {
      result.indices.push(indexOrDataStreamPattern);
    }
  }
  return result;
};
