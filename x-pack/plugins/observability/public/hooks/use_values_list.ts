/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from 'kibana/public';
import { IIndexPattern } from '../../../../../src/plugins/data/common';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { useFetcher } from './use_fetcher';

interface Props {
  sourceField: string;
  query?: string;
  indexPattern: IIndexPattern;
}

export const useValuesList = ({ sourceField, indexPattern, query }: Props) => {
  const {
    services: { http },
  } = useKibana();

  const { data, status } = useFetcher(() => {
    return getValueSuggestions(http!, {
      index: indexPattern?.title ?? 'apm-*',
      query: query || '',
      field: sourceField,
      fieldType: indexPattern?.fields?.find(({ name }) => name === sourceField)?.type,
    });
  }, [indexPattern, sourceField, query, http]);

  return {
    values: (data?.values ?? []).map(({ key }: { key: string | number }) => String(key)),
    loading: status === 'loading' || status === 'pending',
  };
};

export const getValueSuggestions = async (
  http: HttpStart,
  {
    field,
    index,
    query,
    fieldType,
  }: {
    field: string;
    index: string;
    query: string;
    fieldType?: string;
  }
) => {
  return await http.post('/api/uptime/suggestions/values/' + index, {
    method: 'POST',
    body: JSON.stringify({ field, index, query, fieldType }),
  });
};
