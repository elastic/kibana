import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewFieldBase } from '@kbn/es-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import { computeIsESQLQueryAggregating } from '@kbn/securitysolution-utils';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useKibana } from '@kbn/kibana-react-plugin/public';

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
const useEsqlFields: UseEsqlFields = (esqlQuery) => {
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

type UseInvestigationFields = (params: {
  esqlQuery: string | undefined;
  indexPatternsFields: DataViewFieldBase[];
}) => {
  isLoading: boolean;
  investigationFields: DataViewFieldBase[];
};

export const useInvestigationFields: UseInvestigationFields = ({
  esqlQuery,
  indexPatternsFields,
}) => {
  const { fields: esqlFields, isLoading } = useEsqlFields(esqlQuery);

  const investigationFields = useMemo(() => {
    if (!esqlQuery) {
      return indexPatternsFields;
    }

    // alerts generated from non-aggregating queries are enriched with source document
    // so, index patterns fields should be included in the list of investigation fields
    const isEsqlQueryAggregating = computeIsESQLQueryAggregating(esqlQuery);

    return isEsqlQueryAggregating ? esqlFields : [...esqlFields, ...indexPatternsFields];
  }, [esqlFields, esqlQuery, indexPatternsFields]);

  return {
    investigationFields,
    isLoading,
  };
};
