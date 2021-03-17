/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IIndexPattern } from '../../../../../src/plugins/data/common';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { useFetcher } from './use_fetcher';
import { ESFilter } from '../../../../../typings/elasticsearch';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';

interface Props {
  sourceField: string;
  query?: string;
  indexPattern: IIndexPattern;
  filters?: ESFilter[];
}

export const useValuesList = ({ sourceField, indexPattern, query, filters }: Props) => {
  const {
    services: { data },
  } = useKibana<{ data: DataPublicPluginStart }>();

  const { data: values, status } = useFetcher(() => {
    return data.autocomplete.getValueSuggestions({
      indexPattern,
      query: query || '',
      field: indexPattern.fields.find(({ name }) => name === sourceField)!,
      boolFilter: filters ?? [],
    });
  }, [sourceField, query, data.autocomplete, indexPattern, filters]);

  return { values, loading: status === 'loading' || status === 'pending' };
};
