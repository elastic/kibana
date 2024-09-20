/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiDataGridSorting } from '@elastic/eui';
import { useAbortableAsync } from '@kbn/observability-utils/hooks/use_abortable_async';
import React from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { EntitiesGrid } from '../../components/entities_grid';
import { searchBarContentSubject$ } from '../../components/search_bar';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useKibana } from '../../hooks/use_kibana';

export function InventoryPage() {
  const {
    services: { inventoryAPIClient },
  } = useKibana();
  const { query } = useInventoryParams('/');
  const { sortDirection, sortField, pageIndex, kuery, entityTypes } = query;

  const inventoryRoute = useInventoryRouter();

  const {
    value = { entities: [] },
    loading,
    refresh,
  } = useAbortableAsync(
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

  useEffectOnce(() => {
    const searchBarContentSubscription = searchBarContentSubject$.subscribe((searchBar) => {
      if (searchBar.refresh) {
        refresh();
      } else {
        inventoryRoute.push('/', {
          path: {},
          query: { ...query, ...searchBar },
        });
      }
    });
    return () => {
      searchBarContentSubscription.unsubscribe();
    };
  });

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
    <EntitiesGrid
      entities={value.entities}
      loading={loading}
      sortDirection={sortDirection}
      sortField={sortField}
      onChangePage={handlePageChange}
      onChangeSort={handleSortChange}
      pageIndex={pageIndex}
    />
  );
}
