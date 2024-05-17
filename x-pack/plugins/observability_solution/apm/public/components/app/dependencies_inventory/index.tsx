/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import {
  getSearchBarBoolFilter,
  unifiedSearchBarPlaceholder,
} from '../../../../common/dependencies';
import { useApmParams } from '../../../hooks/use_apm_params';
import { SearchBar } from '../../shared/search_bar/search_bar';
import { DependenciesInventoryTable } from './dependencies_inventory_table';

export function DependenciesInventory() {
  const {
    query: { environment },
  } = useApmParams('/dependencies/inventory');
  const searchBarBoolFilter = getSearchBarBoolFilter({
    environment,
  });
  return (
    <>
      <SearchBar
        showTimeComparison
        searchBarPlaceholder={unifiedSearchBarPlaceholder}
        searchBarBoolFilter={searchBarBoolFilter}
      />
      <EuiSpacer size="s" />
      <DependenciesInventoryTable />
    </>
  );
}
