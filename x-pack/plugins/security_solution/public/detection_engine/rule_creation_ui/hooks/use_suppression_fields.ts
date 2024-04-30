/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo, useState } from 'react';
import type { DataViewFieldBase } from '@kbn/es-query';
import useDebounce from 'react-use/lib/useDebounce';

import { useEsqlFields } from './use_investigation_fields';
import { parseEsqlQuery } from '../../rule_creation/logic/esql_validator';

type UseSuppressionFields = (params: {
  esqlQuery: string | undefined;
  indexPatternsFields: DataViewFieldBase[];
}) => {
  isLoading: boolean;
  suppressionFields: DataViewFieldBase[];
};

export const useSuppressionFields: UseSuppressionFields = ({
  esqlQuery,
  indexPatternsFields = [],
}) => {
  const [debouncedEsqlQuery, setDebouncedEsqlQuery] = useState<string | undefined>(undefined);
  const { fields: esqlFields, isLoading } = useEsqlFields(debouncedEsqlQuery);

  const { isEsqlQueryAggregating } = useMemo(
    () => parseEsqlQuery(debouncedEsqlQuery ?? ''),
    [debouncedEsqlQuery]
  );

  useDebounce(
    () => {
      setDebouncedEsqlQuery(esqlQuery);
    },
    1000,
    [esqlQuery]
  );

  const suppressionFields = useMemo(() => {
    if (!debouncedEsqlQuery) {
      return [];
    }

    return isEsqlQueryAggregating ? esqlFields : [...esqlFields, ...indexPatternsFields];
  }, [esqlFields, debouncedEsqlQuery, indexPatternsFields, isEsqlQueryAggregating]);

  return {
    suppressionFields,
    isLoading,
  };
};
