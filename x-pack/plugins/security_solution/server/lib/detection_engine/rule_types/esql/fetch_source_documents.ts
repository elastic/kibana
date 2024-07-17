/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';

interface FetchSourceDocumentsArgs {
  isRuleAggregating: boolean;
  esClient: ElasticsearchClient;
  index: string[];
  results: Array<Record<string, string | null>>;
}
/**
 * fetches source documents by list of their ids
 * it used for a case when non-aggregating has _id property to enrich alert with source document,
 * if some of the properties missed from resulted query
 */
export const fetchSourceDocuments = async ({
  isRuleAggregating,
  results,
  esClient,
  index,
}: FetchSourceDocumentsArgs): Promise<Record<string, { fields: estypes.SearchHit['fields'] }>> => {
  const ids = results.reduce<string[]>((acc, doc) => {
    if (doc._id) {
      acc.push(doc._id);
    }
    return acc;
  }, []);

  // we will fetch source documents only for non-aggregating rules, since aggregating do not have _id
  if (ids.length === 0 || isRuleAggregating) {
    return {};
  }

  const idsQuery = {
    query: {
      bool: {
        filter: {
          ids: { values: ids },
        },
      },
    },
  };

  const response = await esClient.search({
    index,
    body: {
      query: idsQuery.query,
      _source: false,
      fields: ['*'],
    },
    ignore_unavailable: true,
  });

  return response.hits.hits.reduce<Record<string, { fields: estypes.SearchHit['fields'] }>>(
    (acc, hit) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      acc[hit._id!] = { fields: hit.fields };
      return acc;
    },
    {}
  );
};
