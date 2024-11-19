/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import { useEsqlQueryColumns } from '../../../rule_creation/logic/esql_query_columns';

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
  const { data: columns, isLoading } = useEsqlQueryColumns(esqlQuery ?? '');

  const options = useMemo(() => {
    return esqlToOptions(columns, fieldType);
  }, [columns, fieldType]);

  return {
    options,
    isLoading,
  };
};
