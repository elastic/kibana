/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo, useState } from 'react';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewFieldBase } from '@kbn/es-query';
import useDebounce from 'react-use/lib/useDebounce';

import { useQuery } from '@tanstack/react-query';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { computeIsESQLQueryAggregating } from '@kbn/securitysolution-utils';

import { getEsqlQueryConfig } from '../../rule_creation/logic/get_esql_query_config';

const esqlToFields = (
  columns: { error: unknown } | DatatableColumn[] | undefined | null
): DataViewFieldBase[] => {
  if (columns && 'error' in columns) {
    return [];
  }

  const fields = (columns ?? []).map(({ id, meta }) => {
    return {
      name: id,
      type: meta.type,
    };
  });

  return fields;
};

type UseEsqlFields = (esqlQuery: string | undefined) => {
  isLoading: boolean;
  fields: DataViewFieldBase[];
};

/**
 * fetches ES|QL fields and convert them to DataViewBase fields
 */
export const useEsqlFields: UseEsqlFields = (esqlQuery) => {
  const kibana = useKibana<{ data: DataPublicPluginStart }>();

  const { data: dataService } = kibana.services;

  const queryConfig = getEsqlQueryConfig({ esqlQuery, search: dataService?.search?.search });
  const { data, isLoading } = useQuery(queryConfig);

  const fields = useMemo(() => {
    return esqlToFields(data);
  }, [data]);

  return {
    fields,
    isLoading,
  };
};

/**
 * if ES|QL fields and index pattern fields have same name, duplicates will be removed and the rest of fields merged
 * ES|QL fields are first in order, since these are the fields that returned in ES|QL response
 * */
const deduplicateAndMergeFields = (
  esqlFields: DataViewFieldBase[],
  indexPatternsFields: DataViewFieldBase[]
) => {
  const esqlFieldsSet = new Set<string>(esqlFields.map((field) => field.name));
  return [...esqlFields, ...indexPatternsFields.filter((field) => !esqlFieldsSet.has(field.name))];
};

type UseAllEsqlRuleFields = (params: {
  esqlQuery: string | undefined;
  indexPatternsFields: DataViewFieldBase[];
}) => {
  isLoading: boolean;
  fields: DataViewFieldBase[];
};

/**
 * returns all fields available for ES|QL rule:
 * - fields returned from ES|QL query for aggregating queries
 * - fields returned from ES|QL query + index fields for non-aggregating queries
 */
export const useAllEsqlRuleFields: UseAllEsqlRuleFields = ({ esqlQuery, indexPatternsFields }) => {
  const [debouncedEsqlQuery, setDebouncedEsqlQuery] = useState<string | undefined>(undefined);
  const { fields: esqlFields, isLoading } = useEsqlFields(debouncedEsqlQuery);

  const isEsqlQueryAggregating = useMemo(
    () => computeIsESQLQueryAggregating(debouncedEsqlQuery ?? ''),
    [debouncedEsqlQuery]
  );

  useDebounce(
    () => {
      setDebouncedEsqlQuery(esqlQuery);
    },
    300,
    [esqlQuery]
  );

  const fields = useMemo(() => {
    if (!debouncedEsqlQuery) {
      return indexPatternsFields;
    }
    return isEsqlQueryAggregating
      ? esqlFields
      : deduplicateAndMergeFields(esqlFields, indexPatternsFields);
  }, [esqlFields, debouncedEsqlQuery, indexPatternsFields, isEsqlQueryAggregating]);

  return {
    fields,
    isLoading,
  };
};
