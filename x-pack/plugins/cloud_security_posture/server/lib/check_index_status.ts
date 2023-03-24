/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, type Logger } from '@kbn/core/server';
import { IndexStatus } from '../../common/types';

export const checkIndexStatus = async (
  esClient: ElasticsearchClient,
  index: string,
  logger: Logger,
  postureType: 'cspm' | 'kspm' | 'all' = 'all'
): Promise<IndexStatus> => {
  const query =
    postureType === 'all'
      ? {
          match_all: {},
        }
      : {
          bool: {
            filter: {
              term: {
                'rule.benchmark.posture_type': postureType,
              },
            },
          },
        };

  try {
    const queryResult = await esClient.search({
      index,
      query,
      size: 1,
    });

    return queryResult.hits.hits.length ? 'not-empty' : 'empty';
  } catch (e) {
    logger.debug(e);
    if (e?.meta?.body?.error?.type === 'security_exception') {
      return 'unprivileged';
    }

    // Assuming index doesn't exist
    return 'empty';
  }
};
