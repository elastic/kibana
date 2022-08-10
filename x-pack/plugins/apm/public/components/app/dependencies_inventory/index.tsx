/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import {
  getKueryBarBoolFilter,
  kueryBarPlaceholder,
} from '../../../../common/dependencies';
import { useApmParams } from '../../../hooks/use_apm_params';
import { SearchBar } from '../../shared/search_bar';
import { DependenciesInventoryTable } from './dependencies_inventory_table';

export function DependenciesInventory() {
  const {
    query: { environment },
  } = useApmParams('/dependencies/inventory');
  const kueryBarBoolFilter = getKueryBarBoolFilter({
    environment,
  });

  return (
    <>
      <SearchBar
        showTimeComparison
        kueryBarPlaceholder={kueryBarPlaceholder}
        kueryBarBoolFilter={kueryBarBoolFilter}
      />
      <EuiSpacer size="s" />
      <DependenciesInventoryTable />
    </>
  );
}
