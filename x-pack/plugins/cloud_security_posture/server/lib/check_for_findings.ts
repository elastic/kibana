/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, type Logger } from '@kbn/core/server';
import { LATEST_FINDINGS_INDEX_DEFAULT_NS, FINDINGS_INDEX_PATTERN } from '../../common/constants';

export const checkForFindings = async (
  esClient: ElasticsearchClient,
  latestIndex: boolean,
  logger: Logger
): Promise<boolean> => {
  try {
    const queryResult = await esClient.search({
      index: latestIndex ? LATEST_FINDINGS_INDEX_DEFAULT_NS : FINDINGS_INDEX_PATTERN,
      query: {
        match_all: {},
      },
      size: 1,
    });

    return !!queryResult.hits.hits.length;
  } catch (e) {
    logger.debug(e);
    return false;
  }
};
