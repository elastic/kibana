/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { capitalize, uniqBy } from 'lodash';
import { useEffect, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { ESFilter } from '../../../../../src/core/types/elasticsearch';
import { createEsParams, useEsSearch } from './use_es_search';
import { IInspectorInfo } from '../../../../../src/plugins/data/common';
import { TRANSACTION_URL } from '../components/shared/exploratory_view/configurations/constants/elasticsearch_fieldnames';

export interface Props {
  sourceField: string;
  label: string;
  query?: string;
  dataViewTitle?: string;
  filters?: ESFilter[];
  time?: { from: string; to: string };
  keepHistory?: boolean;
  cardinalityField?: string;
  inspector?: IInspectorInfo;
}

export interface ListItem {
  label: string;
  count: number;
}

const uniqueValues = (values: ListItem[], prevValues: ListItem[]) => {
  return uniqBy([...values, ...prevValues], 'label');
};

const getIncludeClause = (sourceField: string, query?: string) => {
  if (!query) {
    return '';
  }

  let includeClause = '';

  if (sourceField === TRANSACTION_URL) {
    // for the url we also match leading text
    includeClause = `*.${query.toLowerCase()}.*`;
  } else {
    if (query[0].toLowerCase() === query[0]) {
      // if first letter is lowercase we also add the capitalize option
      includeClause = `(${query}|${capitalize(query)}).*`;
    } else {
      // otherwise we add lowercase option prefix
      includeClause = `(${query}|${query.toLowerCase()}).*`;
    }
  }

  return includeClause;
};

export const useValuesList = ({
  sourceField,
  dataViewTitle,
  query = '',
  filters,
  time,
  label,
  keepHistory,
  cardinalityField,
}: Props): { values: ListItem[]; loading?: boolean } => {
  const [debouncedQuery, setDebounceQuery] = useState<string>(query);
  const [values, setValues] = useState<ListItem[]>([]);

  const { from, to } = time ?? {};

  useDebounce(
    () => {
      setDebounceQuery(query);
    },
    350,
    [query]
  );

  useEffect(() => {
    if (!query) {
      // in case query is cleared, we don't wait for debounce
      setDebounceQuery(query);
    }
  }, [query]);

  const includeClause = getIncludeClause(sourceField, query);

  const { data, loading } = useEsSearch(
    createEsParams({
      index: dataViewTitle!,
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
              size: 50,
              ...(query ? { include: includeClause } : {}),
            },
            ...(cardinalityField
              ? {
                  aggs: {
                    count: {
                      cardinality: {
                        field: cardinalityField,
                      },
                    },
                  },
                }
              : {}),
          },
        },
      },
    }),
    [debouncedQuery, from, to, JSON.stringify(filters), dataViewTitle, sourceField],
    { name: `get${label.replace(/\s/g, '')}ValuesList` }
  );

  useEffect(() => {
    const valueBuckets = data?.aggregations?.values.buckets;
    const newValues =
      valueBuckets?.map(({ key: value, doc_count: count, count: aggsCount }) => {
        if (aggsCount) {
          return {
            count: aggsCount.value,
            label: String(value),
          };
        }
        return {
          count,
          label: String(value),
        };
      }) ?? [];

    if (keepHistory) {
      setValues((prevState) => {
        return uniqueValues(newValues, prevState);
      });
    } else {
      setValues(newValues);
    }
  }, [data, keepHistory, loading, query]);

  return { values, loading };
};
