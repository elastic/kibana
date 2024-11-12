/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

import { useQuery } from '@tanstack/react-query';

import { useKibana } from '@kbn/kibana-react-plugin/public';

import { getEsqlQueryConfig } from '../../../rule_creation/logic/get_esql_query_config';

type FieldType = 'string';

export const esqlToOptions = (
  columns: { error: unknown } | DatatableColumn[] | undefined | null,
  fieldType?: FieldType
) => {
  if (columns && 'error' in columns) {
    return [];
  }

  const options = (columns ?? []).reduce<Array<{ label: string }>>((acc, { id, meta }) => {
    // if fieldType absent, we do not filter columns by type
    if (!fieldType || fieldType === meta.type) {
      acc.push({ label: id });
    }
    return acc;
  }, []);

  return options;
};

type UseEsqlFieldOptions = (
  esqlQuery: string | undefined,
  fieldType: FieldType
) => {
  isLoading: boolean;
  options: Array<EuiComboBoxOptionOption<string>>;
};

/**
 * fetches ES|QL fields and convert them to Combobox options
 */
export const useEsqlFieldOptions: UseEsqlFieldOptions = (esqlQuery, fieldType) => {
  const kibana = useKibana<{ data: DataPublicPluginStart }>();

  const { data: dataService } = kibana.services;

  const queryConfig = getEsqlQueryConfig({ esqlQuery, search: dataService.search.search });
  const { data, isLoading } = useQuery(queryConfig);

  const options = useMemo(() => {
    return esqlToOptions(data, fieldType);
  }, [data, fieldType]);

  return {
    options,
    isLoading,
  };
};
