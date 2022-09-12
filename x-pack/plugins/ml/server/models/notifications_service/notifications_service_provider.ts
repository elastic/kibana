/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { NotificationSource } from '../../../common/types/notifications';
import { ML_NOTIFICATION_INDEX_PATTERN } from '../../../common/constants/index_patterns';
import type { MlClient } from '../../lib/ml_client';
import type {
  MessagesSearchParams,
  NotificationsCountParams,
} from '../../routes/schemas/notifications_schema';

export class NotificationsService {
  constructor(
    private readonly scopedClusterClient: IScopedClusterClient,
    // @ts-ignore
    private readonly mlClient: MlClient
  ) {}

  async searchMessages(params: MessagesSearchParams) {
    const responseBody = await this.scopedClusterClient.asInternalUser.search<NotificationSource>(
      {
        index: ML_NOTIFICATION_INDEX_PATTERN,
        ignore_unavailable: true,
        from: params.from * params.size,
        size: params.size,
        body: {
          sort: [{ [params.sortField]: { order: params.sortDirection } }],
          query: {
            bool: {
              ...(params.queryString
                ? { must: [{ match_phrase: { message: params.queryString } }] }
                : {}),
              filter: [
                ...(params.earliestMs || params.latestMs
                  ? [
                      {
                        range: {
                          timestamp: {
                            ...(params.earliestMs ? { gt: params.earliestMs } : {}),
                            ...(params.latestMs ? { lte: params.latestMs } : {}),
                          },
                        },
                      },
                    ]
                  : []),
                ...(!!params.level
                  ? [
                      {
                        term: { level: { value: params.level } },
                      },
                    ]
                  : []),
                ...(!!params.type
                  ? [
                      {
                        term: { type: { value: params.type } },
                      },
                    ]
                  : []),
              ],
            },
          },
        },
      },
      { maxRetries: 0 }
    );

    return {
      total: (responseBody.hits.total as SearchTotalHits).value,
      results: responseBody.hits.hits.map((v) => {
        return {
          ...v._source,
          id: v._id,
        };
      }),
    };
  }

  /**
   * Provides a number of messages by level.
   */
  async countMessages(params: NotificationsCountParams) {
    const responseBody = await this.scopedClusterClient.asInternalUser.search({
      size: 0,
      index: ML_NOTIFICATION_INDEX_PATTERN,
      body: {
        query: {
          bool: {
            filter: {
              range: {
                timestamp: {
                  gt: params.lastCheckedAt,
                },
              },
            },
          },
        },
        aggs: {
          by_level: {
            terms: { field: 'level' },
          },
        },
      },
    });

    // @ts-ignore
    return responseBody.aggregations.by_level.buckets.reduce((acc, curr) => {
      acc[curr.key] = curr.doc_count;
      return acc;
    }, {});
  }
}
