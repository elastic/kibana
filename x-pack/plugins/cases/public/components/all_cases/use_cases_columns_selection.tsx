/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';

import { difference } from 'lodash';
import type { CasesColumnSelection } from '../../../common/ui/types';

import { DEFAULT_CASES_TABLE_COLUMNS, LOCAL_STORAGE_KEYS } from '../../../common/constants';
import { useCasesContext } from '../cases_context/use_cases_context';
import type { CasesColumnsConfiguration } from './use_cases_columns_configuration';
import { useCasesColumnsConfiguration } from './use_cases_columns_configuration';

const getTableColumnsLocalStorageKey = (appId: string) => {
  const filteringKey = LOCAL_STORAGE_KEYS.casesTableColumns;
  return `${appId}.${filteringKey}`;
};

const mergeSelectedColumnsWithConfiguration = ({
  selectedColumns,
  casesColumnsConfig,
}: {
  selectedColumns: CasesColumnSelection[];
  casesColumnsConfig: CasesColumnsConfiguration;
}): CasesColumnSelection[] => {
  // selectedColumns is the master
  // iterate over selectedColumns
  //   filter out those not in the configuration
  //   filter out those that !canDisplay
  //   add columnName
  // add missing fields/columns from configuration

  const result = selectedColumns.reduce((accumulator, { field, isChecked }) => {
    if (
      field in casesColumnsConfig &&
      casesColumnsConfig[field].name !== '' &&
      casesColumnsConfig[field].canDisplay
    ) {
      accumulator.push({
        ...casesColumnsConfig[field],
        isChecked,
      });
    }
    return accumulator;
  }, [] as Array<{ field: string; name: string; isChecked: boolean }>);

  // in case the configuration was updated we need to append these to the end of the list
  // can also apply to custom fields
  const missingColumns = difference(
    Object.keys(casesColumnsConfig),
    selectedColumns.map(({ field }) => field)
  );

  return result;
};

export function useCasesColumnsSelection() {
  const { appId } = useCasesContext();
  const casesColumnsConfig = useCasesColumnsConfiguration();
  const defaultSelectedColumns = mergeSelectedColumnsWithConfiguration({
    selectedColumns: DEFAULT_CASES_TABLE_COLUMNS,
    casesColumnsConfig,
  });

  const [selectedColumns, setSelectedColumns] = useLocalStorage<CasesColumnSelection[]>(
    getTableColumnsLocalStorageKey(appId)
  );

  return {
    selectedColumns: selectedColumns
      ? mergeSelectedColumnsWithConfiguration({
          selectedColumns,
          casesColumnsConfig,
        })
      : defaultSelectedColumns,
    setSelectedColumns,
  };
}
