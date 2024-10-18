/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiDataGridSorting, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { EntityColumnIds, EntityType } from '../../../common/entities';
import { EntitiesGrid } from '../entities_grid';
import { useInventoryAbortableAsync } from '../../hooks/use_inventory_abortable_async';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useKibana } from '../../hooks/use_kibana';
import { useInventoryState } from '../../hooks/use_inventory_state';

export function UnifiedInventoryView() {
  const { pagination, setPagination } = useInventoryState();
  const {
    services: { inventoryAPIClient },
  } = useKibana();
  const { query } = useInventoryParams('/');
  const { sortDirection, sortField, kuery, entityTypes } = query;
  const inventoryRoute = useInventoryRouter();
  const pageIndex = pagination?.unified ?? 0;

  const {
    value = { entities: [] },
    loading,
    // refresh,
  } = useInventoryAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entities', {
        params: {
          query: {
            sortDirection,
            sortField,
            entityTypes: entityTypes?.length ? JSON.stringify(entityTypes) : undefined,
            kuery,
          },
        },
        signal,
      });
    },
    [entityTypes, inventoryAPIClient, kuery, sortDirection, sortField]
  );

  function handlePageChange(nextPage: number) {
    setPagination('unified', nextPage);
  }

  function handleSortChange(sorting: EuiDataGridSorting['columns'][0]) {
    inventoryRoute.push('/', {
      path: {},
      query: {
        ...query,
        sortField: sorting.id as EntityColumnIds,
        sortDirection: sorting.direction,
      },
    });
  }

  function handleTypeFilter(type: EntityType) {
    inventoryRoute.push('/', {
      path: {},
      query: {
        ...query,
        // Override the current entity types
        entityTypes: [type],
      },
    });
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow>
        <EntitiesGrid
          entities={value.entities}
          loading={loading}
          sortDirection={sortDirection}
          sortField={sortField}
          onChangePage={handlePageChange}
          onChangeSort={handleSortChange}
          pageIndex={pageIndex}
          onFilterByType={handleTypeFilter}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
