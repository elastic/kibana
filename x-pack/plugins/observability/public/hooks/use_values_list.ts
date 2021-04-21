/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexPattern, isCompleteResponse } from '../../../../../src/plugins/data/common';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { useFetcher } from './use_fetcher';
import { ESFilter } from '../../../../../typings/elasticsearch';
import { buildPhraseFilter } from '../components/shared/exploratory_view/configurations/utils';

export interface Props {
  sourceField: string;
  query?: string;
  indexPattern: IndexPattern;
  filters?: ESFilter[];
  time?: { from: string; to: string };
}

export const useValuesList = ({
  sourceField,
  indexPattern,
  query = '',
  filters,
  time,
}: Props): { values: string[]; loading?: boolean } => {
  const {
    services: { data },
  } = useKibana<{ data: DataPublicPluginStart }>();

  const { from, to } = time ?? {};

  const { data: values, loading } = useFetcher(() => {
    if (!sourceField || !indexPattern) {
      return [];
    }
    return data.autocomplete.getValueSuggestions({
      indexPattern,
      query: query || '',
      useTimeRange: !(from && to),
      field: indexPattern.getFieldByName(sourceField)!,
      boolFilter:
        from && to
          ? [
              ...(filters || []),
              {
                range: {
                  '@timestamp': {
                    gte: from,
                    lte: to,
                  },
                },
              },
            ]
          : filters || [],
    });
  }, [query, sourceField, data.autocomplete, indexPattern, from, to, filters]);

  const { data: values1 } = useFetcher(async () => {
    // if (!sourceField || !indexPattern) {
    //   return [];
    // }
    return new Promise((resolve) => {
      const search$ = data.search
        .search({
          params: {
            index: indexPattern.title,
            body: {
              query: { match_all: {} },
              size: 0,
              aggs: {
                values: {
                  terms: {
                    field: 'monitor.name',
                    size: 65000,
                  },
                },
              },
            },
          },
        })
        .subscribe({
          next: (response) => {
            if (isCompleteResponse(response)) {
              // Final result
              resolve(response);
              search$.unsubscribe();
            } else {
              resolve(response);
            }
          },
        });
    });
  }, [query, sourceField, data.autocomplete, indexPattern, from, to, filters]);

  console.log(values1);

  return { values: values as string[], loading };
};
