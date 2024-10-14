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
import { EntityType } from '../../../common/entities';
import { useInventoryAbortableAsync } from '../../hooks/use_inventory_abortable_async';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';

interface Props {
  entityType?: EntityType;
}

export function GroupedGridWrapper({ entityType }: Props) {
  const { searchBarContentSubject$ } = useInventorySearchBarContext();
  const {
    services: { inventoryAPIClient },
  } = useKibana();

  const { query } = useInventoryParams('/');
  const { pageIndex, kuery, sortField, sortDirection } = query;
  const inventoryRoute = useInventoryRouter();

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
            entityTypes: entityType?.length ? JSON.stringify([entityType]) : undefined,
            kuery,
          },
        },
        signal,
      });
    },
    [entityType, inventoryAPIClient, kuery, sortDirection, sortField]
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
