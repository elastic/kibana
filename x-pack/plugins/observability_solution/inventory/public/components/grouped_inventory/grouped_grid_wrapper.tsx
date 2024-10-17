/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiDataGridSorting } from '@elastic/eui';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { useInventorySearchBarContext } from '../../context/inventory_search_bar_context_provider';
import { useKibana } from '../../hooks/use_kibana';
import { EntitiesGrid } from '../entities_grid';
import type { EntityColumnIds, EntityType } from '../../../common/entities';
import { useInventoryAbortableAsync } from '../../hooks/use_inventory_abortable_async';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useInventoryPageViewContext } from '../../context/inventory_page_view_provider';

interface Props {
  field?: string;
}

export function GroupedGridWrapper({ field }: Props) {
  const { pagination, setPagination } = useInventoryPageViewContext();
  const { query } = useInventoryParams('/');
  const { sortField, sortDirection, kuery } = query;
  const inventoryRoute = useInventoryRouter();
  const pageIndex = (field ? pagination?.[field] : pagination?.none) ?? 0;

  const { searchBarContentSubject$ } = useInventorySearchBarContext();
  const {
    services: { inventoryAPIClient },
  } = useKibana();

  useEffectOnce(() => {
    const searchBarContentSubscription = searchBarContentSubject$.subscribe(
      ({ refresh: isRefresh, ...queryParams }) => {
        if (isRefresh) {
          refresh();
        } else {
          inventoryRoute.push('/', {
            path: {},
            query: { ...query, ...queryParams },
          });
        }
      }
    );
    return () => {
      searchBarContentSubscription.unsubscribe();
    };
  });

  const {
    value = { entities: [] },
    loading,
    refresh,
  } = useInventoryAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entities', {
        params: {
          query: {
            sortDirection,
            sortField,
            entityTypes: field?.length ? JSON.stringify([field]) : undefined,
            kuery,
          },
        },
        signal,
      });
    },
    [field, inventoryAPIClient, kuery, sortDirection, sortField]
  );

  function handlePageChange(nextPage: number) {
    setPagination(field ?? 'none', nextPage);
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
  );
}
