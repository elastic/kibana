/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger } from '@kbn/core/server';
import { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';
import { SEARCH_SESSION_TYPE } from '@kbn/data-plugin/common';
import { ReportedUsage } from './register';

interface SessionPersistedTermsBucket {
  key_as_string: 'false' | 'true';
  doc_count: number;
}

export function fetchProvider(kibanaIndex: string, logger: Logger) {
  return async ({ esClient }: CollectorFetchContext): Promise<ReportedUsage> => {
    try {
      const esResponse = await esClient.search<unknown>({
        index: kibanaIndex,
        body: {
          size: 0,
          aggs: {
            persisted: {
              terms: {
                field: `${SEARCH_SESSION_TYPE}.persisted`,
              },
            },
          },
        },
      });

      const aggs = esResponse.aggregations as Record<
        string,
        estypes.AggregationsMultiBucketAggregateBase<SessionPersistedTermsBucket>
      >;

      const buckets = aggs.persisted.buckets as SessionPersistedTermsBucket[];
      if (!buckets.length) {
        return { transientCount: 0, persistedCount: 0, totalCount: 0 };
      }

      const { transientCount = 0, persistedCount = 0 } = buckets.reduce(
        (usage: Partial<ReportedUsage>, bucket: SessionPersistedTermsBucket) => {
          const key = bucket.key_as_string === 'false' ? 'transientCount' : 'persistedCount';
          return { ...usage, [key]: bucket.doc_count };
        },
        {}
      );
      const totalCount = transientCount + persistedCount;
      logger.debug(`fetchProvider | ${persistedCount} persisted | ${transientCount} transient`);
      return { transientCount, persistedCount, totalCount };
    } catch (e) {
      logger.warn(`fetchProvider | error | ${e.message}`);
      return { transientCount: 0, persistedCount: 0, totalCount: 0 };
    }
  };
}
