/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const useFetchEsqlOptions = () => {};

import type { EuiComboBoxOptionOption } from '@elastic/eui';

import { useQuery } from '@tanstack/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';

import { useKibana } from '@kbn/kibana-react-plugin/public';

import { getEsqlQueryConfig, esqlToOptions } from '../esql_fields_select/validators';
import type { FieldType } from '../esql_fields_select/validators';

type UseEsqlFieldOptions = (
  esqlQuery: string | undefined,
  fieldType: FieldType
) => {
  isLoading: boolean;
  options: Array<EuiComboBoxOptionOption<string>>;
};

export const useEsqlFieldOptions: UseEsqlFieldOptions = (esqlQuery, fieldType) => {
  const kibana = useKibana<{ expressions: ExpressionsStart }>();

  const { expressions } = kibana.services;

  const config = getEsqlQueryConfig({ esqlQuery, expressions });
  const { data, isLoading } = useQuery(config);

  const options = esqlToOptions(data, fieldType);

  return {
    options,
    isLoading,
  };
};
