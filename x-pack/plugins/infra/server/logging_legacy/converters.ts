/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import invert from 'lodash/fp/invert';
import mapKeys from 'lodash/fp/mapKeys';

import { LogEntryFieldsMapping } from '../../common/log_entry';
import { SearchResult } from '../../common/log_search_result';
import { SearchSummaryBucket } from '../../common/log_search_summary';
import {
  DateHistogramResponse,
  HighlightedHit,
  Hit,
  HitsBucket,
  isBucketWithAggregation,
} from './elasticsearch';

export const convertHitToSearchResult = (fields: LogEntryFieldsMapping) => {
  const invertedFields = invert(fields);
  return (hit: HighlightedHit): SearchResult => {
    const matches = mapKeys(key => invertedFields[key], hit.highlight || {});
    return {
      fields: {
        tiebreaker: hit.sort[1], // use the sort property to get the normalized values
        time: hit.sort[0],
      },
      gid: getHitGid(hit),
      matches,
    };
  };
};

export const convertDateHistogramToSearchSummaryBuckets = (
  fields: LogEntryFieldsMapping,
  end: number
) => (buckets: DateHistogramResponse['buckets']): SearchSummaryBucket[] =>
  buckets.reduceRight(
    ({ previousStart, aggregatedBuckets }, bucket) => {
      const representative =
        isBucketWithAggregation<HitsBucket, 'top_entries'>(bucket, 'top_entries') &&
        bucket.top_entries.hits.hits.length > 0
          ? convertHitToSearchResult(fields)(bucket.top_entries.hits.hits[0])
          : null;
      return {
        aggregatedBuckets: [
          ...(representative
            ? [
                {
                  count: bucket.doc_count,
                  end: previousStart,
                  representative,
                  start: bucket.key,
                },
              ]
            : []),
          ...aggregatedBuckets,
        ],
        previousStart: bucket.key,
      };
    },
    { previousStart: end, aggregatedBuckets: [] } as {
      previousStart: number;
      aggregatedBuckets: SearchSummaryBucket[];
    }
  ).aggregatedBuckets;

const getHitGid = (hit: Hit): string => `${hit._index}:${hit._type}:${hit._id}`;
