/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IIndexPattern } from '../../../../../src/plugins/data/common';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { useFetcher } from './use_fetcher';
import { ESFilter } from '../../../../../typings/elasticsearch';

interface Props {
  sourceField: string;
  query?: string;
  indexPattern: IIndexPattern;
  filters?: ESFilter[];
  time?: { from: string; to: string };
}

export const useValuesList = ({
  sourceField,
  indexPattern,
  query = '',
  filters = [],
  time,
}: Props): { values: string[]; loading?: boolean } => {
  const {
    services: { data },
  } = useKibana<{ data: DataPublicPluginStart }>();

  const { data: values, loading } = useFetcher(() => {
    if (!sourceField || !indexPattern) {
      return [];
    }
    return data.autocomplete.getValueSuggestions({
      indexPattern,
      query: query || '',
      useTimeRange: !time,
      field: indexPattern.fields.find(({ name }) => name === sourceField)!,
      boolFilter: time
        ? [
            ...filters,
            {
              range: {
                '@timestamp': {
                  gte: time.from,
                  lte: time.to,
                },
              },
            },
          ]
        : filters,
    });
  }, []);
  // FIXME
  // }, [sourceField, query, time, data.autocomplete, indexPattern]);

  return { values: values as string[], loading };
};
