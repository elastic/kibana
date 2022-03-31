/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'src/core/server';
import { TaggingUsageData, ByTypeTaggingUsageData } from './types';

/**
 * Manual type reflection of the `tagDataAggregations` resulting payload
 */
interface AggregatedTagUsage {
  buckets: Array<{
    key: string;
    doc_count: number;
    nested_ref: {
      tag_references: {
        doc_count: number;
        tag_id: {
          buckets: Array<{
            key: string;
            doc_count: number;
          }>;
        };
      };
    };
  }>;
}

export const fetchTagUsageData = async ({
  esClient,
  kibanaIndex,
}: {
  esClient: ElasticsearchClient;
  kibanaIndex: string;
}): Promise<TaggingUsageData> => {
  const body = await esClient.search({
    index: [kibanaIndex],
    ignore_unavailable: true,
    filter_path: 'aggregations',
    body: {
      size: 0,
      query: {
        bool: {
          must: [hasTagReferenceClause],
        },
      },
      aggs: tagDataAggregations,
    },
  });

  const byTypeUsages: Record<string, ByTypeTaggingUsageData> = {};
  const allUsedTags = new Set<string>();
  let totalTaggedObjects = 0;

  const typeBuckets = (body.aggregations!.by_type as AggregatedTagUsage).buckets;
  typeBuckets.forEach((bucket) => {
    const type = bucket.key;
    const taggedDocCount = bucket.doc_count;
    const usedTagIds = bucket.nested_ref.tag_references.tag_id.buckets.map(
      (tagBucket) => tagBucket.key
    );

    totalTaggedObjects += taggedDocCount;
    usedTagIds.forEach((tagId) => allUsedTags.add(tagId));

    byTypeUsages[type] = {
      taggedObjects: taggedDocCount,
      usedTags: usedTagIds.length,
    };
  });

  return {
    usedTags: allUsedTags.size,
    taggedObjects: totalTaggedObjects,
    types: byTypeUsages,
  };
};

const hasTagReferenceClause = {
  nested: {
    path: 'references',
    query: {
      bool: {
        must: [
          {
            term: {
              'references.type': 'tag',
            },
          },
        ],
      },
    },
  },
};

const tagDataAggregations = {
  by_type: {
    terms: {
      field: 'type',
    },
    aggs: {
      nested_ref: {
        nested: {
          path: 'references',
        },
        aggs: {
          tag_references: {
            filter: {
              term: {
                'references.type': 'tag',
              },
            },
            aggs: {
              tag_id: {
                terms: {
                  field: 'references.id',
                },
              },
            },
          },
        },
      },
    },
  },
};
