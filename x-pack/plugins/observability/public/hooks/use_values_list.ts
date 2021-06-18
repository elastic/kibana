/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { capitalize, union } from 'lodash';
import { useEffect, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { ESFilter } from '../../../../../typings/elasticsearch';
import { createEsParams, useEsSearch } from './use_es_search';

export interface Props {
  sourceField: string;
  query?: string;
  indexPatternTitle?: string;
  filters?: ESFilter[];
  time?: { from: string; to: string };
  keepHistory?: boolean;
}

export interface ListItem {
  label: string;
  count: number;
}

export const useValuesList = ({
  sourceField,
  indexPatternTitle,
  query = '',
  filters,
  time,
  keepHistory,
}: Props): { values: ListItem[]; loading?: boolean } => {
  const [debouncedQuery, setDebounceQuery] = useState<string>(query);
  const [values, setValues] = useState<ListItem[]>([]);

  const { from, to } = time ?? {};

  let includeClause = '';

  if (query) {
    if (query[0].toLowerCase() === query[0]) {
      // if first letter is lowercase we also add the capitalize option
      includeClause = `(${query}|${capitalize(query)}).*`;
    } else {
      // otherwise we add lowercase option prefix
      includeClause = `(${query}|${query.toLowerCase()}).*`;
    }
  }

  useDebounce(
    () => {
      setDebounceQuery(query);
    },
    350,
    [query]
  );

  const { data, loading } = useEsSearch(
    createEsParams({
      index: indexPatternTitle!,
      body: {
        query: {
          bool: {
            filter: [
              ...(filters ?? []),
              ...(from && to
                ? [
                    {
                      range: {
                        '@timestamp': {
                          gte: from,
                          lte: to,
                        },
                      },
                    },
                  ]
                : []),
            ],
          },
        },
        size: 0,
        aggs: {
          values: {
            terms: {
              field: sourceField,
              size: 100,
              ...(query ? { include: includeClause } : {}),
            },
          },
        },
      },
    }),
    [debouncedQuery, from, to, JSON.stringify(filters), indexPatternTitle]
  );

  useEffect(() => {
    const newValues =
      data?.aggregations?.values.buckets.map(({ key: value, doc_count: count }) => ({
        count,
        label: String(value),
      })) ?? [];

    if (keepHistory && query) {
      setValues((prevState) => {
        return union(newValues, prevState);
      });
    } else {
      setValues(newValues);
    }
  }, [data, keepHistory, loading, query]);

  return { values, loading };
};
