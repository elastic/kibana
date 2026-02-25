/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import {
  unifiedSearchBarPlaceholder,
  getSearchBarBoolFilter,
} from '../../../../common/dependencies';
import { useApmHeaderAppActions } from '../../../header_app_actions/use_apm_header_app_actions';
import { ApmEnvironmentFilter } from '../../shared/environment_filter';
import { SearchBar } from '../../shared/search_bar/search_bar';
import { DependenciesInventoryTable } from './dependencies_inventory_table';
import { useApmParams } from '../../../hooks/use_apm_params';

export function DependenciesInventory() {
  useApmHeaderAppActions();
  const {
    query: { environment },
  } = useApmParams('/dependencies/inventory');
  const searchBarBoolFilter = getSearchBarBoolFilter({
    environment,
  });
  return (
    <>
      <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <ApmEnvironmentFilter />
        </EuiFlexItem>
        <SearchBar
          showTimeComparison
          searchBarPlaceholder={unifiedSearchBarPlaceholder}
          searchBarBoolFilter={searchBarBoolFilter}
        />
      </EuiFlexGroup>
      <DependenciesInventoryTable />
    </>
  );
}
