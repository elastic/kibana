/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiComboBoxOptionOption } from '@elastic/eui';

import { debounce } from 'lodash';
import { useQuery } from '@tanstack/react-query';
import type { ExpressionsStart, Datatable } from '@kbn/expressions-plugin/public';
import { fetchFieldsFromESQL } from '@kbn/text-based-editor';

import { useKibana } from '@kbn/kibana-react-plugin/public';

type UseEsqlFieldOptions = (query: string | undefined) => {
  isLoading: boolean;
  options: Array<EuiComboBoxOptionOption<string>>;
};

const debouncedFetchESQL = debounce(fetchFieldsFromESQL, 300);

export const useEsqlFieldOptions: UseEsqlFieldOptions = (query) => {
  const kibana = useKibana<{ expressions: ExpressionsStart }>();
  const { expressions } = kibana.services;

  const queryToPerform = `${query} | limit 0`;
  const { data, isLoading } = useQuery<Datatable | undefined>([queryToPerform], async () => {
    if (!queryToPerform) {
      return;
    }
    return fetchFieldsFromESQL({ esql: queryToPerform }, expressions);
  });

  return {
    options: (data?.columns ?? []).map(({ id }) => ({ label: id })),
    isLoading,
  };
};
