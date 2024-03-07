/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import { useGetAllCaseConfigurations } from './use_get_all_case_configurations';
import { getConfigurationByOwner } from './utils';

export const useGetCaseConfiguration = () => {
  const { owner } = useCasesContext();

  const { data, ...other } = useGetAllCaseConfigurations(owner[0]);

  const ownerSpecificConfiguration = useMemo(
    () => getConfigurationByOwner({ configurations: data, owner: owner[0] }),
    [data, owner]
  );

  return {
    ...other,
    data: ownerSpecificConfiguration,
  };
};

export type UseGetCaseConfiguration = ReturnType<typeof useGetCaseConfiguration>;
