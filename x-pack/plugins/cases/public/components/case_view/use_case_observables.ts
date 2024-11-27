/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { OBSERVABLE_TYPES_BUILTIN_KEYS } from '../../../common/constants';
import type { CaseUI } from '../../../common';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';

export const useCaseObservables = (caseData: CaseUI) => {
  const { data: currentConfiguration, isLoading: loadingCaseConfigure } = useGetCaseConfiguration();

  return useMemo(() => {
    if (loadingCaseConfigure) {
      return {
        observables: [],
        isLoading: true,
      };
    }

    const availableTypesSet = new Set([
      OBSERVABLE_TYPES_BUILTIN_KEYS,
      ...currentConfiguration.observableTypes.map(({ key }) => key),
    ]);

    return {
      observables: caseData.observables.filter(({ typeKey }) => availableTypesSet.has(typeKey)),
      isLoading: loadingCaseConfigure,
    };
  }, [caseData.observables, currentConfiguration.observableTypes, loadingCaseConfigure]);
};
