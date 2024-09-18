/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useAbortableAsync } from '@kbn/observability-utils/hooks/use_abortable_async';
import { EuiDataGridSorting, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EntitiesGrid } from '../../components/entities_grid';
import { useKibana } from '../../hooks/use_kibana';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { SearchBar } from '../../components/search_bar';

export function InventoryPage() {
  const {
    services: { inventoryAPIClient },
  } = useKibana();
  const { query } = useInventoryParams('/');
  const { sortDirection, sortField, pageIndex } = query;
  const inventoryRoute = useInventoryRouter();

  const { value = { entities: [] }, loading } = useAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entities', {
        params: {
          query: {
            sortDirection,
            sortField,
          },
        },
        signal,
      });
    },
    [inventoryAPIClient, sortDirection, sortField]
  );

  function handlePageChange(nextPage: number) {
    inventoryRoute.push('/', {
      path: {},
      query: { ...query, pageIndex: nextPage },
    });
  }

  function handleSortChange(sorting: EuiDataGridSorting['columns'][0]) {
    inventoryRoute.push('/', {
      path: {},
      query: {
        ...query,
        sortField: sorting.id,
        sortDirection: sorting.direction,
      },
    });
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <SearchBar />
      </EuiFlexItem>
      <EuiFlexItem>
        <EntitiesGrid
          entities={value.entities}
          loading={loading}
          sortDirection={sortDirection}
          sortField={sortField}
          onChangePage={handlePageChange}
          onChangeSort={handleSortChange}
          pageIndex={pageIndex}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
