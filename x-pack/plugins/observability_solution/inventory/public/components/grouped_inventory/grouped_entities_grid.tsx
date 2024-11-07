/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiDataGridSorting } from '@elastic/eui';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { useInventorySearchBarContext } from '../../context/inventory_search_bar_context_provider';
import { useKibana } from '../../hooks/use_kibana';
import { EntitiesGrid } from '../entities_grid';
import {
  entityPaginationRt,
  type EntityColumnIds,
  type EntityPagination,
} from '../../../common/entities';
import { useInventoryAbortableAsync } from '../../hooks/use_inventory_abortable_async';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';

interface Props {
  field: string;
}

const paginationDecoder = decodeOrThrow(entityPaginationRt);

export function GroupedEntitiesGrid({ field }: Props) {
  const { query } = useInventoryParams('/');
  const { sortField, sortDirection, kuery, pagination: paginationQuery } = query;
  const inventoryRoute = useInventoryRouter();
  let pagination: EntityPagination | undefined = {};
  try {
    pagination = paginationDecoder(paginationQuery);
  } catch (error) {
    inventoryRoute.push('/', {
      path: {},
      query: {
        sortField,
        sortDirection,
        kuery,
        pagination: undefined,
      },
    });
    window.location.reload();
  }
  const pageIndex = pagination?.[field] ?? 0;

  const { refreshSubject$ } = useInventorySearchBarContext();
  const {
    services: { inventoryAPIClient },
  } = useKibana();

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

  useEffectOnce(() => {
    const refreshSubscription = refreshSubject$.subscribe(refresh);

    return () => refreshSubscription.unsubscribe();
  });

  function handlePageChange(nextPage: number) {
    inventoryRoute.push('/', {
      path: {},
      query: {
        ...query,
        pagination: entityPaginationRt.encode({
          ...pagination,
          [field]: nextPage,
        }),
      },
    });
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

  function handleTypeFilter(type: string) {
    const { pagination: _, ...rest } = query;
    inventoryRoute.push('/', {
      path: {},
      query: {
        ...rest,
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
