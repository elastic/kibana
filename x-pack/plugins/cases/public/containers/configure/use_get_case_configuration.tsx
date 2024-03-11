/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import type { CasesConfigurationUI } from '../types';
import { useGetCaseConfigurationsQuery } from './use_get_case_configurations_query';
import { getConfigurationByOwner } from './utils';

export const useGetCaseConfiguration = () => {
  const { owner } = useCasesContext();

  return useGetCaseConfigurationsQuery<CasesConfigurationUI>({
    select: (data: CasesConfigurationUI[] | null) =>
      getConfigurationByOwner({ configurations: data, owner: owner[0] }),
  });
};

export type UseGetCaseConfiguration = ReturnType<typeof useGetCaseConfiguration>;
