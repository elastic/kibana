/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IIndexPattern } from '../../../../../src/plugins/data/common';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { ObservabilityClientPluginsStart } from '../plugin';
import { useFetcher } from './use_fetcher';

interface Props {
  sourceField: string;
  query?: string;
  indexPattern: IIndexPattern;
}

export const useValuesList = ({ sourceField, indexPattern, query }: Props) => {
  const {
    services: { data },
  } = useKibana<ObservabilityClientPluginsStart>();

  const { data: values, status } = useFetcher(() => {
    return data.autocomplete.getValueSuggestions({
      indexPattern,
      query: query || '',
      useTimeRange: false,
      field: indexPattern.fields.find(({ name }) => name === sourceField)!,
    });
  }, [sourceField, query]);

  return { values, loading: status === 'loading' || status === 'pending' };
};
