/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Bucket,
  UnallowedValueCount,
  UnallowedValueRequestItem,
  UnallowedValueSearchResult,
} from '../types';

export const isBucket = (maybeBucket: unknown): maybeBucket is Bucket =>
  typeof (maybeBucket as Bucket).key === 'string' &&
  typeof (maybeBucket as Bucket).doc_count === 'number';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const getUnallowedValueCount = ({ doc_count, key }: Bucket): UnallowedValueCount => ({
  count: doc_count,
  fieldName: key,
});

export const getUnallowedValues = ({
  requestItems,
  searchResults,
}: {
  requestItems: UnallowedValueRequestItem[];
  searchResults: UnallowedValueSearchResult[] | null;
}): Record<string, UnallowedValueCount[]> => {
  if (searchResults == null || !Array.isArray(searchResults)) {
    return {};
  }

  return requestItems.reduce((acc, { indexFieldName }) => {
    const searchResult = searchResults.find(
      (x) =>
        typeof x.aggregations === 'object' && Array.isArray(x.aggregations[indexFieldName]?.buckets)
    );

    if (
      searchResult != null &&
      searchResult.aggregations != null &&
      searchResult.aggregations[indexFieldName] != null
    ) {
      const buckets = searchResult.aggregations[indexFieldName]?.buckets;

      return {
        ...acc,
        [indexFieldName]: buckets?.flatMap((x) => (isBucket(x) ? getUnallowedValueCount(x) : [])),
      };
    } else {
      return {
        ...acc,
        [indexFieldName]: [],
      };
    }
  }, {});
};
