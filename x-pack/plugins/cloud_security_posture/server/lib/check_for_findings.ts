/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, type Logger } from '@kbn/core/server';
import { LATEST_FINDINGS_INDEX_DEFAULT_NS, FINDINGS_INDEX_PATTERN } from '../../common/constants';

export type FindingsStatus = 'exists' | 'empty' | 'unprivileged';

export const checkForFindingsStatus = async (
  esClient: ElasticsearchClient,
  latestIndex: boolean,
  logger: Logger
): Promise<FindingsStatus> => {
  try {
    const queryResult = await esClient.search({
      index: latestIndex ? LATEST_FINDINGS_INDEX_DEFAULT_NS : FINDINGS_INDEX_PATTERN,
      query: {
        match_all: {},
      },
      size: 1,
    });

    if (queryResult.hits.hits.length) {
      return 'exists';
    }

    return 'empty';
  } catch (e) {
    logger.debug(e);
    if (e?.meta?.body?.error?.type === 'security_exception') {
      return 'unprivileged';
    }

    return 'empty';
  }
};
