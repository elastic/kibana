/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';

import type { CasesColumnSelection } from './types';

import { LOCAL_STORAGE_KEYS } from '../../../common/constants';
import { useCasesColumnsConfiguration } from './use_cases_columns_configuration';
import { mergeSelectedColumnsWithConfiguration } from './utils/merge_selected_columns_with_configuration';
import { getLocalStorageKey } from './utils';
import { useCasesContext } from '../cases_context/use_cases_context';

export function useCasesColumnsSelection() {
  const { owner } = useCasesContext();
  const casesColumnsConfig = useCasesColumnsConfiguration();

  const [selectedColumns, setSelectedColumns] = useLocalStorage<CasesColumnSelection[]>(
    getLocalStorageKey(LOCAL_STORAGE_KEYS.casesTableColumns, owner[0])
  );

  const columns = selectedColumns || [];

  return {
    selectedColumns: mergeSelectedColumnsWithConfiguration({
      selectedColumns: columns,
      casesColumnsConfig,
    }),
    setSelectedColumns,
  };
}
